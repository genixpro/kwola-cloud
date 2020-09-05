from ..base.ProxyPluginBase import ProxyPluginBase
import filetype
import re


class HTMLRewriter(ProxyPluginBase):
    """
        Represents a plugin for the rewrite proxy
    """

    def __init__(self, config):
        self.config = config


    def willRewriteFile(self, path, contentType, fileData):
        if '.js' not in path and not ".json" in path and ".css" not in path:
            kind = filetype.guess(fileData)
            mime = ''
            if kind is not None:
                mime = kind.mime

            # Next, check to see that we haven't gotten an image or something else that we should ignore.
            if mime.startswith("image/") or mime.startswith("video/") or mime.startswith("audio/") or (
                    mime.startswith("application/") and not mime.startswith("application/html")):
                return False

            try:
                stringFileContents = str(fileData, 'utf8').lower()
            except UnicodeDecodeError:
                return False

            if "</html" in stringFileContents or "</body" in stringFileContents:
                return True
            else:
                return False
        else:
            return False



    def rewriteFile(self, path, contentType, fileData):
        stringData = str(path, 'utf8')

        # We want to strip out any "integrity" attributes that we see on html elements
        integrityRegex = re.compile(r"integrity\w*=\w*['\"]sha\d\d?\d?-[a-zA-Z0-9+/=]+['\"]")

        stringData = re.sub(integrityRegex, "", stringData)
        bytesData = bytes(stringData, "utf8")

        return bytesData




    def observeRequest(self, path, statusCode, contentType, headers, origFileData, transformedFileData, didTransform):
        pass

