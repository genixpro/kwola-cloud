import urllib.parse
import hashlib
import base64



class ProxyPluginBase:
    """
        Represents a plugin for the rewrite proxy
    """

    rewriteMode = None

    def willRewriteFile(self, url, contentType, fileData):
        pass


    def rewriteFile(self, url, contentType, fileData):
        pass


    @staticmethod
    def getCleanedFileName(path):
        fileName = urllib.parse.unquote(path.split("/")[-1])
        if "?" in fileName:
            fileName = fileName.split("?")[0]
        if "#" in fileName:
            fileName = fileName.split("#")[0]
        fileName = fileName.replace(".", "_")
        return fileName

    @staticmethod
    def computeHash(fileData):
        """
            Computes a hash for the file data.

            The hash is a full md5 hash, encoded in base64 except with the extra 2 characters removed
            so its purely alphanumeric, although can vary in length.

            @returns longHash as a string
        """
        hasher = hashlib.sha256()
        hasher.update(fileData)

        base64ExtraCharacters = bytes("--", 'utf8')
        longHash = str(base64.b64encode(hasher.digest(), altchars=base64ExtraCharacters), 'utf8')
        longHash = longHash.replace("-", "")
        longHash = longHash.replace("=", "")

        return longHash
