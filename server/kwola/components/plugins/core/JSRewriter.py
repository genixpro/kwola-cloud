from ..base.ProxyPluginBase import ProxyPluginBase
import filetype
import re
import json
import os
import subprocess
import re
import sys
import urllib.parse
from kwola.config.logger import getLogger
import functools
import tempfile



class JSRewriter(ProxyPluginBase):
    """
        Represents a plugin for the rewrite proxy
    """

    rewritePluginName = "javascript"

    knownResponseWrappers = [
        (b"""<!--/*--><html><body><script type="text/javascript"><!--//*/""",
         b"""""")
    ]

    def __init__(self, config):
        self.config = config

        self.multipleBranchesCheckingRegex = re.compile(b"globalKwolaCounter_\\w{10}\\[1\\] ?\\+= ?1;")
        self.branchCounterArraySizeRegex = re.compile(b"globalKwolaCounter_\\w{10} ?= ?new Uint32Array\\((\\d+)\\)")
        self.branchIndexExtractorRegex = re.compile(b"globalKwolaCounter_\\w{10}\\[(\\d+)\\] ?\\+= ?1;")


    def shouldHandleFile(self, resource, fileData):
        jsMimeTypes = [
            "application/x-javascript",
            "application/javascript",
            "application/ecmascript",
            "text/javascript",
            "text/ecmascript"
        ]

        cleanedFileName = self.getCleanedURL(resource.url)

        if ('_js' in cleanedFileName
                and not "_json" in cleanedFileName
                and not "_jsp" in cleanedFileName
                and not cleanedFileName.endswith("_css")) \
              or str(resource.contentType).split(";")[0].strip().lower() in jsMimeTypes:
            kind = filetype.guess(fileData)
            mime = ''
            if kind is not None:
                mime = kind.mime

            # Next, check to see that we haven't gotten an image or something else that we should ignore. This happens, surprisingly.
            if mime.startswith("image/") or mime.startswith("video/") or mime.startswith("audio/") or mime.startswith("application/"):
                return False

            # For some reason, some websites send JSON data in files labelled as javascript files.
            # So we have to double check to make sure we aren't looking at JSON data
            try:
                json.loads(str(fileData, 'utf8').lower())
                return False
            except json.JSONDecodeError:
                pass
            except UnicodeDecodeError:
                pass

            if fileData.startswith(b"<html>"):
                return False

            return True
        else:
            return False

    def getRewriteMode(self, resource, fileData, priorResourceVersion):
        cleanedFileName = self.getCleanedURL(resource.url)

        parsedURL = urllib.parse.urlparse(resource.url)
        foundIgnoreHost = False
        for ignoreHost in self.config['web_session_ignore_javascript_domains']:
            if ignoreHost in parsedURL.hostname:
                foundIgnoreHost = ignoreHost
                break

        if foundIgnoreHost:
            message = f"Warning: Ignoring javascript file {resource.url} because it came from the " \
                      f"domain name '{foundIgnoreHost}' which is marked to be ignored in the config file."

            return None, message

        ignoreKeyword = self.findMatchingJavascriptFilenameIgnoreKeyword(cleanedFileName)
        if ignoreKeyword is not None:
            # if self.config['web_session_print_javascript_translation_info']:
            #     getLogger().info()
            message = f"Warning: Ignoring javascript file {resource.url} because it contained the keyword " \
                                 f"'{ignoreKeyword}' which is marked to be fully ignored in the config file. " \
                                 f"If this is wrong, please update 'web_session_ignore_javascript_keywords' in the config file."

            return None, message

        noLineCountingKeyword = self.findMatchingJavascriptFilenameNoLineCountingKeyword(cleanedFileName)
        if noLineCountingKeyword is not None:
            message = f"Warning: Not installing line counting in the javascript file '{cleanedFileName}' because it matches the " \
                    f"javascript no line counting keyword '{noLineCountingKeyword}'. Event handler tracking will still be installed." \
                    f"This means that no learnings will take place on the code in this file. If this file is actually part of your " \
                    f"application and should be learned on, then please modify your config file kwola.json and remove the ignore " \
                    f"keyword '{noLineCountingKeyword}' from the variable 'web_session_no_line_counting_javascript_file_keywords'. This file will be " \
                    f"cached without Kwola line counting installed. Its faster to install line counting only in the files that need " \
                    f"it."

            return "no_line_counting", message

        translated, translationMessage = self.getRewrittenJavascript(resource, fileData, priorResourceVersion)
        if translated is None:
            return None, translationMessage
        else:
            return "full", translationMessage

    def checkIfRewrittenJSFileHasMultipleBranches(self, rewrittenJSFileData):
        # This method is used to check if the given javascript file, which has already been rewritten,
        # has multiple branches. It is common for old-school jsonp-style requests to use javascript
        # files with no branches and only a single function call. These can clog up the Kwola system
        # without actually delivering any value, since they are only called once.
        match = self.multipleBranchesCheckingRegex.search(rewrittenJSFileData)
        if match is None:
            return False
        else:
            return True

    @functools.lru_cache(maxsize=1024)
    def getRewrittenJavascript(self, resource, fileData, priorResourceVersion):
        jsFileContents = fileData.strip()

        strictMode = False
        if jsFileContents.startswith(b"'use strict';") or jsFileContents.startswith(b'"use strict";'):
            strictMode = True
            jsFileContents = jsFileContents.replace(b"'use strict';", b"")
            jsFileContents = jsFileContents.replace(b'"use strict";', b"")

        wrapperStart = b""
        wrapperEnd = b""
        for wrapper in JSRewriter.knownResponseWrappers:
            if jsFileContents.startswith(wrapper[0]) and jsFileContents.endswith(wrapper[1]):
                jsFileContents = jsFileContents[len(wrapper[0]):-len(wrapper[1])]
                wrapperStart = wrapper[0]
                wrapperEnd = wrapper[1]

        cleanedFileName = self.getCleanedURL(resource.canonicalUrl)
        shortResourceIdHash = ProxyPluginBase.computeHash(bytes(resource.id, 'utf8'))[:10]

        fileNameForBabel = str(resource.id)

        environment = dict(os.environ)

        environment['KWOLA_ENABLE_LINE_COUNTING'] = 'true'
        environment['KWOLA_ENABLE_EVENT_HANDLER_TRACKING'] = 'true'
        environment['KWOLA_RESOURCE_ID'] = shortResourceIdHash # we replace the resource id with a hash for two reasons. One - it keeps the id short when being
                                                               # used inside the translated js file. The other is ensure that multiple different translations of
                                                               # the same javascript file resolve to the same ID, which makes it much easier to diff & realign.

        noLineCountingKeyword = self.findMatchingJavascriptFilenameNoLineCountingKeyword(cleanedFileName)
        if noLineCountingKeyword is not None:
            environment['KWOLA_ENABLE_LINE_COUNTING'] = 'false'

        babelCmd = 'babel'
        if sys.platform == "win32" or sys.platform == "win64":
            babelCmd = 'babel.cmd'

        result = subprocess.run(
            [babelCmd, '-f', fileNameForBabel, '--plugins', 'babel-plugin-kwola', '--retain-lines', '--source-type',
             "script"], input=jsFileContents, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=environment)

        if result.returncode != 0 and "'import' and 'export' may appear only with" in str(result.stderr, 'utf8'):
            result = subprocess.run(
                [babelCmd, '-f', fileNameForBabel, '--plugins', 'babel-plugin-kwola', '--retain-lines', '--source-type',
                 "module"], input=jsFileContents, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=environment)

        if result.returncode != 0:
            cutoffLength = 250

            message = f"Unable to install Kwola line-counting in the Javascript file {resource.url}. Most" \
            f" likely this is because Babel thinks your javascript has invalid syntax, or that" \
            f" babel is not working / not able to find the babel-plugin-kwola / unable to" \
            f" transpile the javascript for some other reason. See the following truncated" \
            f" output: \n"

            if len(result.stdout) > 0:
                message += str(result.stdout[:cutoffLength]) + "\n"
            else:
                message += "No data in standard output"

            if len(result.stderr) > 0:
                message += str(result.stderr[:cutoffLength]) + "\n"
            else:
                message += "No data in standard error output"

            return None, message
        else:
            # Check to see if the resulting file object had multiple branches
            if noLineCountingKeyword is None and not self.checkIfRewrittenJSFileHasMultipleBranches(result.stdout):
                message = f"Ignoring the javascript file {resource.url} because it looks like a JSONP-style request, or some other javascript " \
                                        f"file without a significant number of code branches."

                return None, message

            transformed = wrapperStart + result.stdout + wrapperEnd

            if strictMode:
                transformed = b'"use strict";\n' + transformed

            if priorResourceVersion is not None:
                remappedFileData, message = self.remapTransformedJavascriptFile(resource, result.stdout, priorResourceVersion)

                if remappedFileData is not None:
                    transformed = remappedFileData
            else:
                message = f"Successfully transformed {resource.url} with Kwola modifications."
                if noLineCountingKeyword is None:
                    jsCounterSize = self.getBranchCounterArraySize(transformed)
                    message += f" There were {jsCounterSize} branch indexes in the file."

            return transformed, message


    def findMatchingJavascriptFilenameNoLineCountingKeyword(self, fileName):
        for ignoreKeyword in self.config['web_session_no_line_counting_javascript_file_keywords']:
            if ignoreKeyword in fileName:
                return ignoreKeyword

        return None

    def findMatchingJavascriptFilenameIgnoreKeyword(self, fileName):
        for ignoreKeyword in self.config['web_session_ignore_javascript_keywords']:
            if ignoreKeyword in fileName:
                return ignoreKeyword

        return None

    def rewriteFile(self, resource, fileData, priorResourceVersion):
        rewriteMode, message = self.getRewriteMode(resource, fileData, priorResourceVersion)

        if rewriteMode is not None:
            return self.getRewrittenJavascript(resource, fileData, priorResourceVersion)[0]
        else:
            return fileData


    def getPrettifiedJavascript(self, fileData):
        npmCmd = 'npm'
        if sys.platform == "win32" or sys.platform == "win64":
            npmCmd = 'npm.cmd'

        fileId, fileName = tempfile.mkstemp(suffix=".js")

        with open(fileId, 'wb') as f:
            f.write(fileData)

        result = subprocess.run(
            [npmCmd, 'run', 'format', fileName], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        os.unlink(fileName)

        if result.returncode != 0:
            cutoffLength = 250

            message = f"Unable to to prettify the Javascript code. See the following error:\n"

            if len(result.stdout) > 0:
                message += str(result.stdout[:cutoffLength]) + "\n"
            else:
                message += "No data in standard output"

            if len(result.stderr) > 0:
                message += str(result.stderr[:cutoffLength]) + "\n"
            else:
                message += "No data in standard error output"

            return None, message
        else:
            return result.stdout, ""


    def getBranchCounterArraySize(self, fileData):
        matches = self.branchCounterArraySizeRegex.search(fileData)
        if matches is None:
            return None

        return int(matches[1])

    def replaceCounterArraySizeInLine(self, line, newSize):
        matches = self.branchCounterArraySizeRegex.search(line)

        matchText = matches[0]
        lineLeft = matchText.split(b"(")[0]
        lineRight = matchText.split(b")")[1]
        newMatchText = lineLeft + b"(" + bytes(str(newSize), 'utf8') + b")" + lineRight

        return line.replace(matchText, newMatchText)

    def getBranchIndexesForLine(self, line):
        matches = list(self.branchIndexExtractorRegex.finditer(line))
        if len(matches) == 0:
            return None

        return [int(match[1]) for match in matches]

    def replaceBranchIndexInLine(self, line, oldBranchIndex, newBranchIndex):
        matches = list(self.branchIndexExtractorRegex.finditer(line))

        for match in matches:
            if int(match[1]) == oldBranchIndex:
                matchText = match[0]
                matchLeft = matchText.split(b"[")[0]
                matchRight = matchText.split(b"]")[1]
                newMatchText = matchLeft + b"[" + bytes(str(newBranchIndex), 'utf8') + b"]" + matchRight
                line = line.replace(matchText, newMatchText)
                break

        return line


    def remapTransformedJavascriptFile(self, resource, transformedFileData, priorResourceVersion):
        priorResourceVersionData = priorResourceVersion.loadTranslatedResourceContents(self.config)

        tempPriorJSFileId, tempPriorJSFileName = tempfile.mkstemp(suffix=".js")
        tempCurrentJSFileId, tempCurrentJSFileName = tempfile.mkstemp(suffix=".js")

        prettyPriorJSData, messagePriorJS = self.getPrettifiedJavascript(priorResourceVersionData)
        prettyCurrentJSData, messageCurrentJS = self.getPrettifiedJavascript(transformedFileData)

        if messagePriorJS:
            return None, messagePriorJS
        if messageCurrentJS:
            return None, messageCurrentJS

        currentJSCounterSize = self.getBranchCounterArraySize(prettyCurrentJSData)

        with open(tempPriorJSFileId, 'wb') as f:
            f.write(prettyPriorJSData)

        with open(tempCurrentJSFileId, 'wb') as f:
            f.write(prettyCurrentJSData)

        gitCmd = 'git'
        if sys.platform == "win32" or sys.platform == "win64":
            gitCmd = 'git.cmd'

        compareResult = subprocess.run([gitCmd, 'diff', "-w", tempPriorJSFileName, tempCurrentJSFileName], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        deletedCodeIndexes = set()
        newCodeIndexes = set()
        remappedIndexes = {}

        lines = compareResult.stdout.splitlines()
        for line, nextLine in zip(lines, lines[1:]):
            lineBranchIndexes = self.getBranchIndexesForLine(line)
            nextLineBranchIndexes = self.getBranchIndexesForLine(nextLine)

            if lineBranchIndexes is not None:
                lineBranchIndex = lineBranchIndexes[0]
            else:
                lineBranchIndex = None

            if nextLineBranchIndexes is not None:
                nextLineBranchIndex = nextLineBranchIndexes[0]
            else:
                nextLineBranchIndex = None

            if lineBranchIndex is not None and nextLineBranchIndex is not None:
                if line.startswith(b"-") and nextLine.startswith(b"+"):
                    remappedIndexes[nextLineBranchIndex] = lineBranchIndex
            elif lineBranchIndex is not None and nextLineBranchIndex is None:
                if line.startswith(b"-") and nextLine.startswith(b"-"):
                    deletedCodeIndexes.add(lineBranchIndex)
                elif line.startswith(b"+") and nextLine.startswith(b"+"):
                    newCodeIndexes.add(lineBranchIndex)


        # Perform a couple of validations here to ensure the algorithm is working.
        remappedDeleted = deletedCodeIndexes.intersection(remappedIndexes.values())
        if len(remappedDeleted) > 0:
            message = f"Error in remapping the branch indexes for {resource.id}. Some branch indexes were both remapped and deleted. This means there is a flaw in the realignment algorithm itself that it didn't work on this specific diff situation. Indexes in question: {sorted(list(remappedDeleted))}"
            raise RuntimeError(message)

        remappedAdded = newCodeIndexes.intersection(remappedIndexes.keys())
        if len(remappedAdded) > 0:
            message = f"Error in remapping the branch indexes for {resource.id}. Some branch indexes were both remapped and added as fresh new indexes. This means there is a flaw in the realignment algorithm itself that it didn't work on this specific diff situation. Indexes in question: {sorted(list(remappedAdded))}"
            raise RuntimeError(message)

        # Now create a new version of the remapped javascript file.
        currentNewBranchIndex = currentJSCounterSize
        updatedLines = []
        for line in transformedFileData.splitlines():
            newLine = line
            counterSize = self.getBranchCounterArraySize(line)
            lineBranchIndexes = self.getBranchIndexesForLine(line)

            if counterSize is not None:
                newLine = self.replaceCounterArraySizeInLine(line, currentJSCounterSize + len(newCodeIndexes))
            elif lineBranchIndexes is not None:
                for branchIndex in lineBranchIndexes:
                    if branchIndex in newCodeIndexes:
                        newLine = self.replaceBranchIndexInLine(line, branchIndex, currentNewBranchIndex)
                        currentNewBranchIndex += 1
                    elif branchIndex in remappedIndexes:
                        newLine = self.replaceBranchIndexInLine(line, branchIndex, remappedIndexes[branchIndex])

            updatedLines.append(newLine)

        newFile = b"".join(updatedLines)

        message = f"Successfully transformed and remapped the javascript resource {resource.id} from the prior version. Total new branch indexes: {currentJSCounterSize} Remapped indexes: {len(remappedIndexes)}. Deleted indexes: {len(deletedCodeIndexes)}. New indexes: {len(newCodeIndexes)}"

        return newFile, message
