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

from ...components.proxy.RewriteProxy import RewriteProxy
from ...components.proxy.PathTracer import PathTracer
from ...components.proxy.NetworkErrorTracer import NetworkErrorTracer
from ...config.logger import getLogger, setupLocalLogging
from ..plugins.core.JSRewriter import JSRewriter
from ..plugins.core.HTMLRewriter import HTMLRewriter
from contextlib import closing
import pickle
from threading import Thread
import asyncio
# import billiard as multiprocessing
import socket
import billiard as multiprocessing
import time
import requests
import traceback
import os
import signal
from ...config.logger import getLogger
from ..utils.retry import autoretry
from ...errors import ProxyVerificationFailed


class ProxyProcess:
    """
        This class is used to run and manage the proxy subprocess
    """

    sharedMultiprocessingContext = multiprocessing.get_context('spawn')

    def __init__(self, config, plugins=None):
        if plugins is None:
            self.plugins = []
        else:
            self.plugins = plugins

        self.plugins = [
            JSRewriter(config),
            HTMLRewriter(config)
        ] + self.plugins

        self.config = config
        self.commandQueue = ProxyProcess.sharedMultiprocessingContext.Queue()
        self.resultQueue = ProxyProcess.sharedMultiprocessingContext.Queue()

        self.proxyProcess = ProxyProcess.sharedMultiprocessingContext.Process(target=self.runProxyServerSubprocess, args=(self.config, self.commandQueue, self.resultQueue, pickle.dumps(self.plugins, protocol=pickle.HIGHEST_PROTOCOL)), daemon=True)
        try:
            self.proxyProcess.start()
        except BrokenPipeError:
            raise ProxyVerificationFailed(f"Error in the proxy - unable to start the child proxy process. Received a BrokenPipeError - it is not known why this happens.")

        # Wait for the result indicating that the proxy process is ready
        self.port = self.resultQueue.get()
        time.sleep(0.5)
        getLogger().info(f"Proxy process has started on port {self.port} with pid {self.proxyProcess.pid}")
        self.checkProxyFunctioning()

    def __del__(self):
        self.shutdown()

    def shutdown(self):
        if self.proxyProcess is not None:
            self.commandQueue.put("exit")
            self.proxyProcess = None

    @staticmethod
    def findFreePort():
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            s.bind(('', 0))
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            return s.getsockname()[1]

    def getPathTrace(self):
        self.commandQueue.put("getPathTrace")
        return self.resultQueue.get()

    def resetPathTrace(self):
        self.commandQueue.put("resetPathTrace")

    def getMostRecentNetworkActivityTime(self):
        self.commandQueue.put("getMostRecentNetworkActivityTime")
        return self.resultQueue.get()

    def getNetworkErrors(self):
        self.commandQueue.put("getNetworkErrors")
        return pickle.loads(self.resultQueue.get())

    def resetNetworkErrors(self):
        self.commandQueue.put("resetNetworkErrors")

    @autoretry(logRetries=False)
    def checkProxyFunctioning(self):
        proxies = {
            'http': f'http://127.0.0.1:{self.port}',
            'https': f'http://127.0.0.1:{self.port}',
        }

        testUrl = "http://kros3.kwola.io/"
        response = requests.get(testUrl, proxies=proxies, verify=False)
        if response.status_code != 200:
            raise ProxyVerificationFailed(f"Error in the proxy - unable to connect to the testing url at {testUrl} through the local proxy. Status code: {response.status_code}. Body: {response.content}")
        else:
            self.resetPathTrace()
            self.resetNetworkErrors()


    @staticmethod
    def runProxyServerSubprocess(config, commandQueue, resultQueue, plugins):
        setupLocalLogging()

        plugins = pickle.loads(plugins)

        codeRewriter = RewriteProxy(config, plugins)
        pathTracer = PathTracer()
        networkErrorTracer = NetworkErrorTracer()

        proxyThread = Thread(target=ProxyProcess.runProxyServerThread, args=(codeRewriter, pathTracer, networkErrorTracer, resultQueue), daemon=True)
        proxyThread.start()

        while True:
            message = commandQueue.get()

            if message == "resetPathTrace":
                pathTracer.recentPaths = set()

            if message == "resetNetworkErrors":
                networkErrorTracer.errors = []

            if message == "getPathTrace":
                pathTrace = {
                    "seen": pathTracer.seenPaths,
                    "recent": pathTracer.recentPaths
                }

                resultQueue.put(pathTrace)

            if message == "getNetworkErrors":
                resultQueue.put(pickle.dumps(networkErrorTracer.errors, protocol=pickle.HIGHEST_PROTOCOL))

            if message == "getMostRecentNetworkActivityTime":
                resultQueue.put(pathTracer.mostRecentNetworkActivityTime)

            if message == "exit":
                exit(0)

    @staticmethod
    def runProxyServerThread(codeRewriter, pathTracer, networkErrorTracer, resultQueue):
        while True:
            try:
                ProxyProcess.runProxyServerOnce(codeRewriter, pathTracer, networkErrorTracer, resultQueue)
            except Exception:
                getLogger().warning(f"Had to restart the mitmproxy due to an exception: {traceback.format_exc()}")

    @staticmethod
    def runProxyServerOnce(codeRewriter, pathTracer, networkErrorTracer, resultQueue):
        from mitmproxy import proxy, options
        from mitmproxy.tools.dump import DumpMaster
        import mitmproxy.exceptions

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # We have a retry mechanism here because it may take multiple attempts to get a free port
        while True:
            try:
                port = ProxyProcess.findFreePort()
                opts = options.Options(listen_port=port, http2=False, ssl_insecure=True)
                pconf = proxy.config.ProxyConfig(opts)

                m = DumpMaster(opts, with_termlog=False, with_dumper=False)
                m.server = proxy.server.ProxyServer(pconf)
                m.addons.add(codeRewriter)
                m.addons.add(pathTracer)
                m.addons.add(networkErrorTracer)
                break
            except mitmproxy.exceptions.ServerException:
                getLogger().warning(f"Had to restart the mitmproxy due to an exception: {traceback.format_exc()}")

        resultQueue.put(port)
        m.run()
