




class PluginBase:
    """
        Represents a plugin for the Kwola core, allowing external code to hook into
        various pieces of functionality in the core.
    """

    def __init__(self):
        pass

    
    def javascriptFileLoaded(self):
        pass

    def resourceLoaded(self):
        pass


    def actionPerformed(self):
        pass


    def sessionFinished(self):
        pass

