#
#     Kwola is an AI algorithm that learns how to use other programs
#     automatically so that it can find bugs in them.
#
#     Copyright (C) 2020 Kwola Software Testing Inc.
#
#     This program is free software: you can redistribute it and/or modify
#     it under the terms of the GNU Affero General Public License as
#     published by the Free Software Foundation, either version 3 of the
#     License, or (at your option) any later version.
#
#     This program is distributed in the hope that it will be useful,
#     but WITHOUT ANY WARRANTY; without even the implied warranty of
#     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#     GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


from ...config.logger import getLogger
from mitmproxy.script import concurrent
import datetime
import os
import os.path
import traceback
import gzip
import filetype
import re
import json
from pprint import pformat
from ..plugins.base.ProxyPluginBase import ProxyPluginBase
from ...datamodels.ResourceModel import Resource
from ...datamodels.ResourceVersionModel import ResourceVersion
from ..utils.deunique import deuniqueString
from ...datamodels.CustomIDField import CustomIDField

class RewriteProxy:
    pathNumericalIdSegmentRegex = re.compile(r"/\d+")

    def __init__(self, config, plugins, testingRunId=None, testingStepId=None, executionSessionId=None):
        self.config = config

        self.memoryCache = {}
        self.originalRewriteItemsBySize = {}
        self.plugins = plugins
        self.testingRunId = testingRunId
        self.testingStepId = testingStepId
        self.executionSessionId = executionSessionId
        self.executionTraceId = None

        self.resourcesByCanonicalURL = {}

        self.allResources = Resource.loadAllResources(config)
        for resource in self.allResources:
            self.resourcesByCanonicalURL[resource.canonicalUrl] = resource

        getLogger().info(f"Loaded data for {len(self.allResources)} resources")

    @staticmethod
    def canonicalizeUrl(url):
        url = deuniqueString(url)
        url = RewriteProxy.pathNumericalIdSegmentRegex.sub("/:id", url)
        return url

    def getHashFromCacheFileName(self, fileName):
        hash = fileName.split("_")[-1].split(".")[0]
        return hash

    def getCacheFileName(self, fileHash, fileURL):
        fileName = ProxyPluginBase.getCleanedFileName(fileURL)

        fileNameSplit = fileName.split("_")

        if len(fileNameSplit) > 1:
            extension = fileNameSplit[-1]
            fileNameRoot = "_".join(fileNameSplit[:-1])
        else:
            extension = ""
            fileNameRoot = fileName

        badChars = "%=~`!@#$^&*(){}[]\\|'\":;,<>/?+"
        for char in badChars:
            extension = extension.replace(char, "-")
            fileNameRoot = fileNameRoot.replace(char, "-")

        # Replace all unicode characters with -CODE-, with CODE being replaced by the unicode character code
        fileNameRoot = str(fileNameRoot.encode('ascii', 'xmlcharrefreplace'), 'ascii').replace("&#", "-").replace(";", "-")
        extension = str(extension.encode('ascii', 'xmlcharrefreplace'), 'ascii').replace("&#", "-").replace(";", "-")

        cacheFileName = fileNameRoot[:100] + "_" + fileHash + "." + extension

        return cacheFileName

    def request(self, flow):
        flow.request.headers['Accept-Encoding'] = 'identity'

    def requestheaders(self, flow):
        try:
            flow.request.headers['Accept-Encoding'] = 'identity'

            # Add in a bunch of Kwola related headers to the request. This makes it possible for upstream
            # systems to identify kwola related requests and separate them
            flow.request.headers['X-Kwola'] = 'true'

            if 'applicationId' in self.config and self.config['applicationId'] is not None:
                flow.request.headers['X-Kwola-Application-Id'] = self.config['applicationId']

            if self.testingRunId is not None:
                flow.request.headers['X-Kwola-Testing-Run-Id'] = self.testingRunId

            if self.testingStepId is not None:
                flow.request.headers['X-Kwola-Testing-Step-Id'] = self.testingStepId

            if self.executionSessionId is not None:
                flow.request.headers['X-Kwola-Execution-Session-Id'] = self.executionSessionId

            if self.executionTraceId is not None:
                flow.request.headers['X-Kwola-Execution-Trace-Id'] = self.executionTraceId

            # Add the word "Kwola" to the user agent string
            if 'User-Agent' in flow.request.headers:
                flow.request.headers['User-Agent'] = flow.request.headers['User-Agent'] + " Kwola"
            elif 'user-agent' in flow.request.headers:
                flow.request.headers['user-agent'] = flow.request.headers['user-agent'] + " Kwola"
            else:
                flow.request.headers['User-Agent'] = "Kwola"
        except Exception as e:
            getLogger().error(traceback.format_exc())


    def decompressDataIfNeeded(self, data):
        gzipped = False

        data = bytes(data)

        kind = filetype.guess(data)
        mime = ''
        if kind is not None:
            mime = kind.mime

        # Decompress the file if it appears to be a gzip archive
        if mime == "application/gzip":
            try:
                data = gzip.decompress(data)
                gzipped = True
            except OSError:
                pass

        return data, gzipped

    @concurrent
    def response(self, flow):
        """
            The full HTTP response has been read.
        """
        try:
            contentType = flow.response.headers.get('Content-Type')
            if contentType is None:
                contentType = flow.response.headers.get('content-type')

            # Don't attempt to transform if its not a 2xx, just let it pass through
            if flow.response.status_code < 200 or flow.response.status_code >= 300:
                return

            canonicalUrl = self.canonicalizeUrl(flow.request.url)
            resource = self.resourcesByCanonicalURL.get(canonicalUrl, None)
            fileHash = ProxyPluginBase.computeHash(bytes(flow.response.data.content))
            canonicalFileHash = ProxyPluginBase.computeHash(bytes(deuniqueString(flow.response.data.content), 'utf8'))
            versionId = None
            fileURL = flow.request.url
            originalFileContents = bytes(flow.response.data.content)
            unzippedFileContents, gzipped = self.decompressDataIfNeeded(originalFileContents)

            if resource is not None:
                if not resource.didRewriteResource:
                    return
                else:
                    versionId = resource.getVersionId(fileHash)
                    transformedContents = None

                    if versionId in self.memoryCache:
                        transformedContents = self.memoryCache[versionId]
                    else:
                        resourceVersion = ResourceVersion.loadFromDisk(versionId, self.config, printErrorOnFailure=False)
                        if resourceVersion is not None:
                            transformedContents = resourceVersion.loadTranslatedResourceContents(self.config)

                    if transformedContents is not None:
                        self.memoryCache[versionId] = transformedContents
                        flow.response.data.headers['Content-Length'] = str(len(transformedContents))
                        flow.response.data.content = transformedContents

                        return
            else:
                resourceId = ProxyPluginBase.getCleanedFileName(canonicalUrl)
                if 'applicationId' in self.config:
                    resourceId = self.config['applicationId'] + "-" + resourceId

                resource = Resource(
                    id=resourceId,
                    owner=(self.config['owner'] if 'owner' in self.config else None),
                    applicationId=(self.config['applicationId'] if 'applicationId' in self.config else None),
                    url=fileURL,
                    canonicalUrl=canonicalUrl,
                    creationDate=datetime.datetime.now(),
                    didRewriteResource=False,
                    contentType=contentType,
                    rewritePluginName=None,
                    rewriteMode=None,
                    rewriteMessage=None,
                    versionSaveMode="all"
                )

                if "application/json" in contentType \
                        or "_json" in ProxyPluginBase.getCleanedFileName(fileURL) \
                        or "_jsp" in ProxyPluginBase.getCleanedFileName(fileURL):
                    resource.versionSaveMode = "never"
                else:
                    try:
                        json.loads(unzippedFileContents)
                        resource.versionSaveMode = "never"
                    except json.JSONDecodeError:
                        pass

                resource.saveToDisk(self.config)

                self.resourcesByCanonicalURL[canonicalUrl] = resource

                versionId = resource.getVersionId(fileHash)

            resourceVersion = ResourceVersion(
                id=resource.getVersionId(fileHash),
                owner=(self.config['owner'] if 'owner' in self.config else None),
                applicationId=(self.config['applicationId'] if 'applicationId' in self.config else None),
                testingRunId=(self.config['testingRunId'] if 'testingRunId' in self.config else None),
                resourceId=resource.id,
                fileHash=fileHash,
                canonicalFileHash=canonicalFileHash,
                creationDate=datetime.datetime.now(),
                url=fileURL,
                canonicalUrl=canonicalUrl,
                contentType=contentType,
                didRewriteResource=False,
                rewritePluginName=None,
                rewriteMode=None,
                rewriteMessage=None,
                originalLength=len(unzippedFileContents),
                rewrittenLength=None
            )

            if len(unzippedFileContents) == 0:
                self.memoryCache[versionId] = unzippedFileContents

                resource.saveToDisk(self.config)
                if resource.versionSaveMode != "never":
                    resourceVersion.saveToDisk(self.config)

                return

            chosenPlugin = None
            for plugin in self.plugins:
                if plugin.shouldHandleFile(fileURL, contentType, unzippedFileContents):
                    chosenPlugin = plugin
                    break

            if chosenPlugin is not None:
                resource.rewritePluginName = chosenPlugin.rewritePluginName
                resourceVersion.rewritePluginName = chosenPlugin.rewritePluginName

                foundSimilarOriginal, foundOriginalFileURL = self.findSimilarOriginal(fileURL, unzippedFileContents)

                if foundSimilarOriginal:
                    rewriteMessage = f"Decided not to translate file {fileURL} because it looks extremely similar to a request we have already seen at this url: {foundOriginalFileURL}. This is probably a JSONP style response, and we don't translate these since they are only ever called once, but can clog up the system."

                    resource.rewriteMode = None
                    resource.rewriteMessage = rewriteMessage
                    resource.didRewriteResource = False

                    resourceVersion.rewriteMode = None
                    resourceVersion.rewriteMessage = rewriteMessage
                    resourceVersion.didRewriteResource = True

                else:
                    rewriteMode, rewriteMessage = chosenPlugin.getRewriteMode(fileURL, contentType, unzippedFileContents)
                    resource.rewriteMode = rewriteMode
                    resource.rewriteMessage = rewriteMessage
                    resourceVersion.rewriteMode = rewriteMode
                    resourceVersion.rewriteMessage = rewriteMessage
                    if rewriteMode is not None:
                        resource.didRewriteResource = True
                        resourceVersion.didRewriteResource = True

            if resourceVersion.rewriteMode is not None:
                if self.config['web_session_print_javascript_translation_info'] and resourceVersion.rewriteMessage:
                    getLogger().info(resourceVersion.rewriteMessage)

                transformedContents = chosenPlugin.rewriteFile(fileURL, contentType, unzippedFileContents)

                if gzipped:
                    transformedContents = gzip.compress(transformedContents, compresslevel=9)

                if resource.versionSaveMode != "never":
                    resourceVersion.saveOriginalResourceContents(self.config, unzippedFileContents)
                    resourceVersion.saveTranslatedResourceContents(self.config, transformedContents)
                    resourceVersion.rewrittenLength = len(transformedContents)

                self.memoryCache[versionId] = transformedContents

                flow.response.data.headers['Content-Length'] = str(len(transformedContents))
                flow.response.data.content = transformedContents

            else:
                if self.config['web_session_print_javascript_translation_info'] and resourceVersion.rewriteMessage:
                    getLogger().warning(resourceVersion.rewriteMessage)

                self.memoryCache[versionId] = originalFileContents

                if resource.versionSaveMode != "never":
                    resourceVersion.saveOriginalResourceContents(self.config, originalFileContents)

            # Note! this extra resource save might be creating too much load. Eventually we should improve this.
            resource.saveToDisk(self.config)
            if resource.versionSaveMode != "never":
                resourceVersion.saveToDisk(self.config)

        except Exception as e:
            getLogger().error(traceback.format_exc())
            return


    def findSimilarOriginal(self, fileURL, unzippedFileContents):
        foundSimilarOriginal = False
        foundOriginalFileURL = None

        size = len(unzippedFileContents)
        if size not in self.originalRewriteItemsBySize:
            self.originalRewriteItemsBySize[size] = []

        for sameSizedOriginal, originalFileURL in self.originalRewriteItemsBySize[size]:
            charsDifferent = 0
            for chr, otherChr in zip(unzippedFileContents, sameSizedOriginal):
                if chr != otherChr:
                    charsDifferent += 1
            portionDifferent = charsDifferent / size
            if portionDifferent < 0.20:
                # Basically we are looking at what is effectively the same file with some minor differences.
                # This is common with ad-serving, tracking tags and JSONP style responses.
                foundSimilarOriginal = True
                foundOriginalFileURL = originalFileURL
                break

        if not foundSimilarOriginal:
            self.originalRewriteItemsBySize[size].append((unzippedFileContents, fileURL))

        return foundSimilarOriginal, foundOriginalFileURL
