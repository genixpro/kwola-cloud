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
from ...datamodels.ActionMapModel import ActionMap
from ...datamodels.actions.ClearFieldAction import ClearFieldAction
from ...datamodels.actions.ClickTapAction import ClickTapAction
from ...datamodels.actions.RightClickAction import RightClickAction
from ...datamodels.actions.TypeAction import TypeAction
from ...datamodels.actions.WaitAction import WaitAction
from ...datamodels.actions.ScrollingAction import ScrollingAction
from ...datamodels.errors.ExceptionError import ExceptionError
from ...datamodels.errors.LogError import LogError
from ...datamodels.ExecutionTraceModel import ExecutionTrace
from ..plugins.base.ProxyPluginBase import ProxyPluginBase
from ..plugins.base.WebEnvironmentPluginBase import WebEnvironmentPluginBase
from ...errors import AutologinFailure
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.proxy import Proxy
from selenium.webdriver.common.keys import Keys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from ..utils.video import chooseBestFfmpegVideoCodec
from selenium.webdriver.common.proxy import Proxy, ProxyType
from ..proxy.ProxyProcess import ProxyProcess
from ..utils.retry import autoretry
import cv2
import hashlib
import traceback
import numpy
import copy
import numpy as np
import re
from pprint import pprint
import os
import shutil
import os.path
import selenium.common.exceptions
import subprocess
import tempfile
import time
import pickle
import urllib.parse
import urllib3
import psutil
import sys

class WebEnvironmentSession:
    """
        This class represents a single tab in the web environment.
    """

    def __init__(self, config, tabNumber, plugins=None, executionSession=None, browser=None, windowSize=None):
        self.config = config
        self.targetURL = config['url']
        self.browser = browser

        if windowSize is None:
            self.windowSize = "desktop"
        else:
            self.windowSize = windowSize

        self.hasBrowserDied = False
        self.browserDeathReason = None

        if plugins is None:
            self.plugins = []
        else:
            self.plugins = plugins


        self.proxyPlugins = [plugin for plugin in self.plugins if isinstance(plugin, ProxyPluginBase)]
        self.plugins = [plugin for plugin in self.plugins if isinstance(plugin, WebEnvironmentPluginBase)]

        self.executionSession = executionSession

        self.targetHostRoot = self.getHostRoot(self.targetURL)

        self.urlWhitelistRegexes = [re.compile(pattern) for pattern in self.config['web_session_restrict_url_to_regexes']]

        self.proxy = None
        self.driver = None

        self.edgeUserDataDir = None

        self.tabNumber = tabNumber
        self.traceNumber = 0
        self.noActivityTimeout = self.config['web_session_no_network_activity_timeout']

        self.initializeProxy()
        self.initializeWebBrowser()

    def __del__(self):
        self.shutdown()

    def initializeProxy(self):
        testingRunId = None
        testingStepId = None
        executionSessionId = None
        if self.executionSession is not None:
            testingRunId = self.executionSession.testingRunId
            testingStepId = self.executionSession.testingStepId
            executionSessionId = self.executionSession.id

        self.proxy = ProxyProcess(self.config, plugins=self.proxyPlugins, testingRunId=testingRunId, testingStepId=testingStepId, executionSessionId=executionSessionId)

    def initialize(self):
        self.fetchTargetWebpage()

        if self.config.autologin:
            self.runAutoLogin()

        self.traceNumber = 0

        for plugin in self.plugins:
            if self.executionSession is not None:
                plugin.browserSessionStarted(self.driver, self.proxy, self.executionSession)

        self.enforceMemoryLimits()

        # Set the browser and user agent on the execution session
        if self.executionSession is not None:
            self.executionSession.windowSize = self.windowSize
            self.executionSession.browser = self.browser
            self.executionSession.userAgent = self.proxy.getUserAgent()

    def enforceMemoryLimits(self):
        if self.driver.service.process.returncode is not None:
            try:
                pid = self.driver.service.process.pid  # is a Popen instance for the chromedriver process
                p = psutil.Process(pid)

                p.rlimit(psutil.RLIMIT_AS, (1024*1024*1024, 1024*1024*1024))
                for child in p.children(recursive=True):
                    child.rlimit(psutil.RLIMIT_AS, (1024*1024*1024, 1024*1024*1024))
            except OSError:
                pass

    def initializeWebBrowser(self):
        if self.browser is None or self.browser == "chrome":
            chrome_options = ChromeOptions()
            chrome_options.headless = self.config['web_session_headless']
            if self.config['web_session_enable_shared_chrome_cache']:
                chrome_options.add_argument(f"--disk-cache-dir={self.config.getKwolaUserDataDirectory('chrome_cache')}")
                chrome_options.add_argument(f"--disk-cache-size={1024*1024*1024}")

            chrome_options.add_argument(f"--disable-gpu")
            chrome_options.add_argument(f"--disable-features=VizDisplayCompositor")
            chrome_options.add_argument(f"--no-sandbox")
            chrome_options.add_argument(f"--temp-profile")
            chrome_options.add_argument(f"--proxy-server=localhost:{self.proxy.port}")
            if sys.platform == "win32" or sys.platform == "win64":
                chrome_options.add_argument(f"--disable-dev-shm-usage")

            capabilities = webdriver.DesiredCapabilities.CHROME
            capabilities['loggingPrefs'] = {'browser': 'ALL'}

            self.driver = webdriver.Chrome(desired_capabilities=capabilities, options=chrome_options)
        elif self.browser == "edge":
            edge_options = EdgeOptions()
            edge_options.use_chromium = True
            edge_options.headless = self.config['web_session_headless']
            if self.config['web_session_enable_shared_edge_cache']:
                edge_options.add_argument(f"--disk-cache-dir={self.config.getKwolaUserDataDirectory('edge_cache')}")
                edge_options.add_argument(f"--disk-cache-size={1024*1024*1024}")

            self.edgeUserDataDir = tempfile.mkdtemp()
            edge_options.add_argument(f"--user-data-dir={self.edgeUserDataDir}")

            edge_options.add_argument(f"--proxy-server=localhost:{self.proxy.port}")

            capabilities = webdriver.DesiredCapabilities.EDGE
            capabilities['loggingPrefs'] = {'browser': 'ALL'}

            self.driver = webdriver.Edge(capabilities=capabilities, options=edge_options)
        elif self.browser == 'firefox':
            firefox_options = FirefoxOptions()
            firefox_options.headless = self.config['web_session_headless']

            proxy = Proxy()
            proxy.http_proxy = f"localhost:{self.proxy.port}"
            firefox_options.proxy = proxy

            firefox_options.log.level = "info"

            capabilities = webdriver.DesiredCapabilities.FIREFOX
            capabilities['loggingPrefs'] = {'browser': 'ALL'}

            self.driver = webdriver.Firefox(desired_capabilities=capabilities,
                                            options=firefox_options,
                                            service_log_path=tempfile.mkstemp()[1])
        else:
            raise ValueError(f"Unsupported value for browser '{self.browser}'. Valid values are 'firefox', 'chrome' or 'edge'.")

        window_size = self.driver.execute_script("""
            return [window.outerWidth - window.innerWidth + arguments[0],
              window.outerHeight - window.innerHeight + arguments[1]];
            """, self.config['web_session_width'][self.windowSize], self.config['web_session_height'][self.windowSize])

        self.driver.set_window_size(*window_size)
        self.driver.set_script_timeout(self.config['web_session_script_execution_timeout'])
        self.driver.set_page_load_timeout(self.config['web_session_page_load_timeout'])

    def fetchTargetWebpage(self):
        try:
            self.driver.get(self.targetURL)

            for error in self.proxy.getNetworkErrors():
                if error.url == self.targetURL and error.statusCode != 401 and error.statusCode != 403:
                    self.driver.get("data:,")
                    raise RuntimeError(f"Received a fatal network error while attempting to load the starting page.")

        except selenium.common.exceptions.TimeoutException:
            self.driver.get("data:,")
            raise RuntimeError(f"The web-browser timed out while attempting to load the target URL {self.targetURL}")

        self.waitUntilNoNetworkActivity()

        time.sleep(self.config['web_session_initial_fetch_sleep_time'])

        # No action maps is a strong signal that the page has not loaded correctly.
        actionMaps = self.getActionMaps()
        if len(actionMaps) == 0:
            self.driver.get("data:,")
            raise RuntimeError(f"Error: loading page {self.targetURL} lead to a page with no action maps.")


    def getHostRoot(self, url):
        host = str(urllib.parse.urlparse(url).hostname)

        hostParts = host.split(".")

        if ".com." in host or ".co." in host:
            hostRoot = ".".join(hostParts[-3:])
        else:
            hostRoot = ".".join(hostParts[-2:])

        return hostRoot

    def shutdown(self):
        if hasattr(self, 'plugins') and hasattr(self, "driver"):
            for plugin in self.plugins:
                if self.executionSession is not None:
                    plugin.cleanup(self.driver, self.proxy, self.executionSession)
            self.plugins = []

        if hasattr(self, 'proxy'):
            if self.proxy is not None:
                self.proxy.shutdown()
                self.proxy = None

        if hasattr(self, "driver"):
            if self.driver:
                try:
                    self.driver.quit()
                except ImportError:
                    pass

            self.driver = None

        if hasattr(self, "edgeUserDataDir"):
            if self.edgeUserDataDir is not None:
                shutil.rmtree(self.edgeUserDataDir)
                self.edgeUserDataDir = None

    def waitUntilDocumentReadyState(self):
        startTime = datetime.now()
        while self.driver.execute_script('return document.readyState;') != "complete":
            time.sleep(0.50)
            elapsedTime = abs((datetime.now() - startTime).total_seconds())
            if elapsedTime > self.noActivityTimeout:
                break

        elapsedTime = abs((datetime.now() - startTime).total_seconds())
        return elapsedTime

    def waitUntilNoNetworkActivity(self):
        readyStateWaitTime = self.waitUntilDocumentReadyState()

        startTime = datetime.now()
        elapsedTime = 0
        startPaths = set(self.proxy.getPathTrace()['recent'])
        while abs((self.proxy.getMostRecentNetworkActivityTimeAndPath()[0] - datetime.now()).total_seconds()) < self.config['web_session_no_network_activity_wait_time']:
            time.sleep(0.10)
            elapsedTime = abs((datetime.now() - startTime).total_seconds())
            # if elapsedTime > 2.0:
            #     recent = self.proxy.getMostRecentNetworkActivityTimeAndPath()
            #     print(elapsedTime, abs((recent[0] - datetime.now()).total_seconds()), recent[1], recent[2], flush=True)

            if elapsedTime > self.noActivityTimeout:
                if self.noActivityTimeout > 1:
                    getLogger().warning(f"Warning! There was a timeout while waiting for network activity from the browser to die down. Maybe it is causing non"
                          f" stop network activity all on its own? Try changing the config value web_session_no_network_activity_wait_time lower"
                          f" if constant network activity is the expected behaviour. List of suspect paths: {set(self.proxy.getPathTrace()['recent']).difference(startPaths)}")

                    # We adjust the configuration value for this downwards so that if these timeouts are occuring, they're impact on the rest
                    # of the operations are gradually reduced so that the run can proceed
                    self.noActivityTimeout = self.noActivityTimeout * 0.50

                break
        elapsedTime = abs((datetime.now() - startTime).total_seconds())
        return elapsedTime + readyStateWaitTime

    def findElementsForAutoLogin(self):
        actionMaps = self.getActionMaps()

        # First, try to find the email, password, and submit inputs
        emailInputs = []
        passwordInputs = []
        loginButtons = []

        emailKeywords = ['use', 'mail', 'name']
        passwordKeywords = ['pass']
        loginKeywords = ['log', 'sub', 'sign', 'connexion']

        for map in actionMaps:
            found = False
            for matchKeyword in emailKeywords:
                if matchKeyword in map.keywords and map.elementType == "input":
                    emailInputs.append(map)
                    found = True
                    break
            if found:
                continue
            for matchKeyword in passwordKeywords:
                if matchKeyword in map.keywords and map.elementType == "input":
                    passwordInputs.append(map)
                    found = True
                    break
            if found:
                continue
            for matchKeyword in loginKeywords:
                if matchKeyword in map.keywords and map.elementType in ['input', 'button', 'div']:
                    loginButtons.append(map)
                    found = True
                    break
            if found:
                continue

        return emailInputs, passwordInputs, loginButtons

    def runAutoLogin(self, createLoginVideo=False):
        """
            This method is used to perform the automatic heuristic based login.
        """
        try:
            screenshotIndex = 0
            autologinMoviePath = None
            screenshotDirectory = None

            if createLoginVideo:
                screenshotDirectory = tempfile.mkdtemp()

            def addLoginVideoFrame():
                nonlocal screenshotIndex
                if createLoginVideo:
                    filePath = os.path.join(screenshotDirectory, f"kwola-screenshot-{screenshotIndex}.png")
                    self.driver.save_screenshot(filePath)
                    screenshotIndex += 1

            def renderAutologinVideo():
                nonlocal autologinMoviePath
                if createLoginVideo:
                    autologinMoviePath = os.path.join(screenshotDirectory, "autologin.mp4")

                    result = subprocess.run(['ffmpeg', '-f', 'image2', "-r", "1", '-i', 'kwola-screenshot-%01d.png', '-vcodec',
                                             chooseBestFfmpegVideoCodec(), '-pix_fmt', 'yuv420p', '-crf', '15', '-preset',
                                             'veryslow', autologinMoviePath],
                                            cwd=screenshotDirectory, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

                    if result.returncode != 0:
                        errorMsg = f"Error! Attempted to create a movie using ffmpeg and the process exited with exit-code {result.returncode}. The following output was observed:\n"
                        errorMsg += str(result.stdout, 'utf8') + "\n"
                        errorMsg += str(result.stderr, 'utf8') + "\n"
                        getLogger().error(errorMsg)

            addLoginVideoFrame()

            time.sleep(self.config['web_session_autologin_sleep_times'])
            self.waitUntilNoNetworkActivity()

            addLoginVideoFrame()

            emailInputs, passwordInputs, loginButtons = self.findElementsForAutoLogin()

            # Scroll down to the input elements so that they are all within view.
            if len(emailInputs) > 0 or len(passwordInputs) > 0 or len(loginButtons) > 0:
                scrollMargin = 250

                elem = None
                if len(emailInputs) > 0:
                    elem = emailInputs[0]
                if len(passwordInputs) > 0:
                    elem = passwordInputs[0]
                if len(loginButtons) > 0:
                    elem = loginButtons[0]

                self.driver.execute_script(f"""window.scrollTo(0, {max(0, elem.top - scrollMargin)});""")
                emailInputs, passwordInputs, loginButtons = self.findElementsForAutoLogin()

            # check to see if there is a "login" button that we need to click first to expose
            # the login form
            if (len(emailInputs) == 0) and (len(passwordInputs) == 0) and len(loginButtons) > 0:
                loginTriggerButton = loginButtons[0]

                loginClickAction = ClickTapAction(x=loginTriggerButton.left + 1,
                                                  y=loginTriggerButton.top + 1,
                                                  source="autologin",
                                                  times=1,
                                                  type="click")
                success, networkWaitTime = self.performActionInBrowser(loginClickAction)

                emailInputs, passwordInputs, loginButtons = self.findElementsForAutoLogin()

                loginButtons = list(filter(lambda button: button.keywords != loginTriggerButton.keywords, loginButtons))

                addLoginVideoFrame()

            hasTypedInEmail = False

            # check to see if this is an "email first" login
            if (len(emailInputs) > 0) and (len(passwordInputs) == 0) and len(loginButtons) > 0:
                emailTypeAction = TypeAction(x=emailInputs[0].left + 1,
                                             y=emailInputs[0].top + 1,
                                             source="autologin",
                                             label="email",
                                             text=self.config.email,
                                             type="typeEmail")

                success1, networkWaitTime = self.performActionInBrowser(emailTypeAction)

                addLoginVideoFrame()

                loginTriggerButton = loginButtons[0]

                loginClickAction = ClickTapAction(x=loginTriggerButton.left + 1,
                                                  y=loginTriggerButton.top + 1,
                                                  source="autologin",
                                                  times=1,
                                                  type="click")

                success, networkWaitTime = self.performActionInBrowser(loginClickAction)

                emailInputs, passwordInputs, loginButtons = self.findElementsForAutoLogin()

                loginButtons = list(filter(lambda button: button.keywords != loginTriggerButton.keywords, loginButtons))

                hasTypedInEmail = True

                addLoginVideoFrame()

            if (len(emailInputs) == 0 and not hasTypedInEmail) or len(passwordInputs) == 0 or len(loginButtons) == 0:
                renderAutologinVideo()
                raise AutologinFailure(f"Error! Did not detect the all of the necessary HTML elements to perform an autologin. Found: {len(emailInputs)} email looking elements, {len(passwordInputs)} password looking elements, and {len(loginButtons)} submit looking elements. Kwola will be proceeding without automatically logging in.", autologinMoviePath)

            if len(emailInputs) == 1:
                # Find the login button that is closest to the email input while being below it
                loginButtons = sorted(
                    filter(lambda button: bool(button.top > emailInputs[0].bottom), loginButtons),
                    key=lambda button: abs(emailInputs[0].top - button.top)
                )
            elif len(passwordInputs) == 1:
                # Find the login button that is closest to the password input while being below it
                loginButtons = sorted(
                    filter(lambda button: bool(button.top > passwordInputs[0].bottom), loginButtons),
                    key=lambda button: abs(passwordInputs[0].top - button.top)
                )
            else:
                # Find the login button that is lowest down on the page
                loginButtons = sorted(loginButtons, key=lambda button: button.top, reverse=True)

            startURL = self.driver.current_url

            emailTypeAction = None
            success1 = True
            if not hasTypedInEmail:
                emailTypeAction = TypeAction(x=emailInputs[0].left + 1,
                                             y=emailInputs[0].top + 1,
                                             source="autologin",
                                             label="email",
                                             text=self.config.email,
                                             type="typeEmail")

            passwordTypeAction = TypeAction(x=passwordInputs[0].left + 1,
                                            y=passwordInputs[0].top + 1,
                                            source="autologin",
                                            label="password",
                                            text=self.config.password,
                                            type="typePassword")

            loginClickAction = ClickTapAction(x=loginButtons[0].left + 1,
                                              y=loginButtons[0].top + 1,
                                              source="autologin",
                                              times=1,
                                              type="click")

            if not hasTypedInEmail:
                success1, networkWaitTime = self.performActionInBrowser(emailTypeAction)

            addLoginVideoFrame()

            success2, networkWaitTime = self.performActionInBrowser(passwordTypeAction)

            addLoginVideoFrame()

            success3, networkWaitTime = self.performActionInBrowser(loginClickAction)

            addLoginVideoFrame()

            time.sleep(self.config['web_session_autologin_sleep_times'])
            self.waitUntilNoNetworkActivity()

            addLoginVideoFrame()

            renderAutologinVideo()

            didURLChange = bool(startURL != self.driver.current_url)

            if success1 and success2 and success3:
                if didURLChange:
                    getLogger().info(f"Heuristic autologin appears to have worked!")
                    return autologinMoviePath
                else:
                    message = f"Unable to verify that the heuristic login worked. The login actions were performed but the URL did not change."
                    # raise AutologinFailure(message, autologinMoviePath)
                    getLogger().warning(message)
                    return autologinMoviePath
            else:
                raise AutologinFailure(f"There was an error running one of the actions required for the heuristic auto login.", autologinMoviePath)
        except urllib3.exceptions.MaxRetryError as e:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during autologin: {traceback.format_exc()}"
            return None
        except selenium.common.exceptions.WebDriverException:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during autologin: {traceback.format_exc()}"
            return None
        except urllib3.exceptions.ProtocolError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during autologin: {traceback.format_exc()}"
            return None

    def getActionMaps(self):
        try:
            if self.hasBrowserDied:
                return []

            elementActionMaps = self.driver.execute_script("""
                function isFunction(functionToCheck) {
                 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
                }
            
                const actionMaps = [];
                const domElements = document.querySelectorAll("*");
                
                for(let element of domElements)
                {
                    const bounds = element.getBoundingClientRect();
                   
                    if (bounds.bottom < 0 || bounds.right < 0)
                        continue;
                        
                    if (bounds.top > window.innerHeight || bounds.left > window.innerWidth)
                        continue;
                    
                    const paddingLeft = Number(window.getComputedStyle(element, null).getPropertyValue('padding-left').replace("px", ""));
                    const paddingRight = Number(window.getComputedStyle(element, null).getPropertyValue('padding-right').replace("px", ""));
                    const paddingTop = Number(window.getComputedStyle(element, null).getPropertyValue('padding-top').replace("px", ""));
                    const paddingBottom = Number(window.getComputedStyle(element, null).getPropertyValue('padding-bottom').replace("px", ""));
                    
                    const data = {
                        canClick: false,
                        canRightClick: false,
                        canType: false,
                        canScroll: false,
                        left: bounds.left + paddingLeft + 3,
                        right: bounds.right - paddingRight - 3,
                        top: bounds.top + paddingTop + 3,
                        bottom: bounds.bottom - paddingBottom - 3,
                        width: bounds.width - paddingLeft - paddingRight - 6,
                        height: bounds.height - paddingTop - paddingBottom - 6,
                        elementType: element.tagName.toLowerCase(),
                        keywords: ( element.textContent + " " + element.getAttribute("class") + " " +
                                    element.getAttribute("name") + " " + element.getAttribute("id") + " " + 
                                    element.getAttribute("type") + " " + element.getAttribute("placeholder") + " " + 
                                    element.getAttribute("title") + " " + element.getAttribute("aria-label") + " " + 
                                    element.getAttribute("aria-placeholder") + " " + element.getAttribute("aria-roledescription")
                                  ).toLowerCase().replace(/\\s+/g, " ").replace("null", "").replace("undefined", "").trim(),
                        inputValue: String(element.value).replace("undefined", "").replace("null", ""),
                        attributes: {
                            "href": String(element.getAttribute("href")).replace("null", "").replace("undefined", ""),
                            "src": String(element.getAttribute("src")).replace("null", "").replace("undefined", ""),
                            "class": String(element.getAttribute("class")).replace("null", "").replace("undefined", ""),
                            "name": String(element.getAttribute("name")).replace("null", "").replace("undefined", ""),
                            "id": String(element.getAttribute("id")).replace("null", "").replace("undefined", ""),
                            "type": String(element.getAttribute("type")).replace("null", "").replace("undefined", ""),
                            "placeholder": String(element.getAttribute("placeholder")).replace("null", "").replace("undefined", ""),
                            "title": String(element.getAttribute("title")).replace("null", "").replace("undefined", ""),
                            "aria-label": String(element.getAttribute("aria-label")).replace("null", "").replace("undefined", ""),
                            "aria-placeholder": String(element.getAttribute("aria-placeholder")).replace("null", "").replace("undefined", ""),
                            "aria-roledescription": String(element.getAttribute("aria-roledescription")).replace("null", "").replace("undefined", "")
                        }
                    };
                    
                    if ( element.tagName === "BUTTON"
                            || element.tagName === "AREA"
                            || element.tagName === "AUDIO"
                            || element.tagName === "VIDEO"
                            || element.tagName === "OPTION"
                            || element.tagName === "SELECT")
                        data.canClick = true;
                    
                    if (element.tagName === "A" && element.getAttribute("href") && element.getAttribute("href") !== "#")
                        data.canClick = true;
                        
                    if (element.tagName === "INPUT" && !(element.getAttribute("type") === "text" 
                                                         || element.getAttribute("type") === "" 
                                                         || element.getAttribute("type") === "password"
                                                         || element.getAttribute("type") === "email"
                                                         || element.getAttribute("type") === null 
                                                         || element.getAttribute("type") === undefined 
                                                         || !element.getAttribute("type")
                                                      ))
                        data.canClick = true;
                    
                    const elemStyle = window.getComputedStyle(element);
                    if ((elemStyle.getPropertyValue("overflow-y") === "scroll" || elemStyle.getPropertyValue("overflow-y") === "auto" ||
                        (elemStyle.getPropertyValue("overflow-y") === "visible" && (element.tagName.toLowerCase() === "html" || element.tagName.toLowerCase() === "body") )
                       )
                         && element.scrollHeight > element.clientHeight)
                        data.canScroll = true;
                    
                    if (element.tagName === "TEXTAREA")
                        data.canType = true;
                        
                    if (element.tagName === "INPUT" && (element.getAttribute("type") === "text" 
                                                         || element.getAttribute("type") === "" 
                                                         || element.getAttribute("type") === "password"
                                                         || element.getAttribute("type") === "email"
                                                         || element.getAttribute("type") === null 
                                                         || element.getAttribute("type") === undefined 
                                                         || !element.getAttribute("type")
                                                      ))
                        data.canType = true;
                    
                    if (isFunction(element.onclick) 
                        || isFunction(element.onauxclick) 
                        || isFunction(element.onmousedown)
                        || isFunction(element.onmouseup)
                        || isFunction(element.ontouchend)
                        || isFunction(element.ontouchstart))
                        data.canClick = true;
                    
                    if (isFunction(element.oncontextmenu))
                        data.canRightClick = true;
                    
                    if (isFunction(element.onkeydown) 
                        || isFunction(element.onkeypress) 
                        || isFunction(element.onkeyup))
                        data.canType = true;
                        
                    if (window.kwolaEvents && window.kwolaEvents.has(element))
                    {
                        const knownEvents = window.kwolaEvents.get(element);
                        if (knownEvents.indexOf("click") != -1)
                        {
                            data.canClick = true;
                        }
                        if (knownEvents.indexOf("contextmenu") != -1)
                        {
                            data.canRightClick = true;
                        }
                        if (knownEvents.indexOf("dblclick") != -1)
                        {
                            data.canClick = true;
                        }
                        
                        if (knownEvents.indexOf("mousedown") != -1)
                        {
                            data.canClick = true;
                            data.canRightClick = true;
                        }
                        if (knownEvents.indexOf("mouseup") != -1)
                        {
                            data.canClick = true;
                            data.canRightClick = true;
                        }
                        
                        if (knownEvents.indexOf("keydown") != -1)
                        {
                            data.canType = true;
                        }
                        if (knownEvents.indexOf("keypress") != -1)
                        {
                            data.canType = true;
                        }
                        if (knownEvents.indexOf("keyup") != -1)
                        {
                            data.canType = true;
                        }
                    }
                    
                    if (data.width >= 1 && data.height >= 1)
                        actionMaps.push(data);
                }
                
                return actionMaps;
            """)

            actionMaps = []

            for actionMapData in elementActionMaps:
                actionMap = ActionMap(**actionMapData)

                if self.config['prevent_offsite_links']:
                    if actionMap.elementType == 'a':
                        if actionMap.attributes['href'] and self.isURLOffsite(actionMap.attributes['href']):
                            # Skip this element because it links to an offsite page.
                            continue

                # Cut the keywords off at 1024 characters to prevent too much memory / storage usage
                actionMap.keywords = actionMap.keywords[:self.config['web_session_action_map_max_keyword_size']]

                overlapMap = None
                for existingMap in actionMaps:
                    if existingMap.doesOverlapWith(actionMap, tolerancePixels=self.config['testing_repeat_action_pixel_overlap_tolerance']):
                        overlapMap = existingMap
                        break

                if overlapMap is not None:
                    overlapEventsCount = int(overlapMap.canScroll) + int(overlapMap.canClick) + int(overlapMap.canType) + int(overlapMap.canRightClick)
                    actionMapEventsCount = int(actionMap.canScroll) + int(actionMap.canClick) + int(actionMap.canType) + int(actionMap.canRightClick)

                    if actionMapEventsCount > overlapEventsCount:
                        overlapMap.elementType = actionMap.elementType

                    overlapMap.canScroll = overlapMap.canScroll or actionMap.canScroll
                    overlapMap.canClick = overlapMap.canClick or actionMap.canClick
                    overlapMap.canType = overlapMap.canType or actionMap.canType
                    overlapMap.canRightClick = overlapMap.canRightClick or actionMap.canRightClick
                    overlapMap.keywords = overlapMap.keywords + " " + actionMap.keywords
                    overlapMap.inputValue = overlapMap.inputValue + " " + actionMap.inputValue

                    attributeKeys = set(overlapMap.attributes.keys()).union(set(actionMap.attributes.keys()))
                    for key in attributeKeys:
                        overlapMap.attributes[key] = (overlapMap.attributes.get(key, "") + " " + actionMap.attributes.get(key, "")).strip()
                else:
                    actionMaps.append(actionMap)

            filteredActionMaps = []
            for actionMap in actionMaps:
                if actionMap.canType or actionMap.canClick or actionMap.canRightClick or actionMap.canScroll:
                    filteredActionMaps.append(actionMap)

            return filteredActionMaps
        except urllib3.exceptions.MaxRetryError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred while fetching action maps: {traceback.format_exc()}"
            return []
        except selenium.common.exceptions.WebDriverException:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred while fetching action maps: {traceback.format_exc()}"
            return []
        except urllib3.exceptions.ProtocolError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred while fetching action maps: {traceback.format_exc()}"
            return []

    def performActionInBrowser(self, action):
        success = True

        try:
            element = self.driver.execute_script("""
            return document.elementFromPoint(arguments[0], arguments[1]);
            """, action.x, action.y)

            if isinstance(action, ClickTapAction):
                actionChain = webdriver.common.action_chains.ActionChains(self.driver)
                actionChain.move_to_element_with_offset(element, 0, 0)
                if action.times == 1:
                    if self.config['web_session_print_every_action']:
                        getLogger().info(f"Clicking {action.x} {action.y} from {action.source}")
                    actionChain.click(on_element=element)
                    actionChain.pause(self.config.web_session_perform_action_wait_time)
                elif action.times == 2:
                    if self.config['web_session_print_every_action']:
                        getLogger().info(f"Double Clicking {action.x} {action.y} from {action.source}")
                    actionChain.double_click(on_element=element)
                    actionChain.pause(self.config.web_session_perform_action_wait_time)

                actionChain.perform()

            if isinstance(action, RightClickAction):
                if self.config['web_session_print_every_action']:
                    getLogger().info(f"Right Clicking {action.x} {action.y} from {action.source}")
                actionChain = webdriver.common.action_chains.ActionChains(self.driver)
                actionChain.move_to_element_with_offset(element, 0, 0)
                actionChain.context_click(on_element=element)
                actionChain.pause(self.config.web_session_perform_action_wait_time)
                actionChain.perform()

            if isinstance(action, TypeAction):
                if self.config['web_session_print_every_action']:
                    getLogger().info(f"Typing {action.text} at {action.x} {action.y} from {action.source}")
                actionChain = webdriver.common.action_chains.ActionChains(self.driver)
                actionChain.move_to_element_with_offset(element, 0, 0)
                actionChain.click(on_element=element)
                actionChain.pause(self.config.web_session_perform_action_wait_time)
                actionChain.send_keys_to_element(element, action.text)
                actionChain.pause(self.config.web_session_perform_action_wait_time)
                actionChain.perform()

            if isinstance(action, ScrollingAction):
                if self.config['web_session_print_every_action']:
                    getLogger().info(f"Scrolling {action.direction} at {action.x} {action.y} from {action.source}")

                if action.direction == "down":
                    self.driver.execute_script("window.scrollTo(0, window.scrollY + 400)")
                else:
                    self.driver.execute_script("window.scrollTo(0, Math.max(0, window.scrollY - 400))")
                time.sleep(1.0)

            if isinstance(action, ClearFieldAction):
                if self.config['web_session_print_every_action']:
                    getLogger().info(f"Clearing field at {action.x} {action.y} from {action.source}")
                element.clear()

            if isinstance(action, WaitAction):
                getLogger().info(f"Waiting for {action.time} at {action.x} {action.y} from {action.source}")
                time.sleep(action.time)

        except selenium.common.exceptions.MoveTargetOutOfBoundsException as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a MoveTargetOutOfBoundsException exception!")

            success = False
        except selenium.common.exceptions.StaleElementReferenceException as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a StaleElementReferenceException!")
            success = False
        except selenium.common.exceptions.InvalidElementStateException as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a InvalidElementStateException!")

            success = False
        except selenium.common.exceptions.TimeoutException as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a TimeoutException!")

            success = False
        except selenium.common.exceptions.JavascriptException as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a JavascriptException!")

            success = False
        except urllib3.exceptions.MaxRetryError as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to a MaxRetryError!")

            success = False
        except AttributeError as e:
            if self.config['web_session_print_every_action_failure']:
                getLogger().warning(f"Running {action.source} action {action.type} at {action.x},{action.y} failed due to an AttributeError!")

            success = False

        # If there was an alert generated as a result of the action, then try to close it.
        try:
            self.driver.switch_to.alert.accept()
        except selenium.common.exceptions.NoAlertPresentException:
            pass

        networkWaitTime = self.waitUntilNoNetworkActivity()

        return success, networkWaitTime

    def isURLOffsite(self, url):
        offsite = False
        if url != "data:," and self.getHostRoot(url) != self.targetHostRoot:
            offsite = True

        whitelistMatched = False
        if len(self.urlWhitelistRegexes) == 0:
            whitelistMatched = True

        for regex in self.urlWhitelistRegexes:
            if regex.search(url) is not None:
                whitelistMatched = True

        if not whitelistMatched:
            offsite = True

        return offsite

    def checkOffsite(self, priorURL):
        try:
            # If the browser went off site and off site links are disabled, then we send it back to the url it started from
            if self.config['prevent_offsite_links']:
                networkWaitTime = self.waitUntilNoNetworkActivity()

                current_url = self.driver.current_url

                offsite = self.isURLOffsite(current_url)

                if offsite:
                    getLogger().info(f"The browser session went offsite (to {current_url}) and going offsite is disabled. The browser is being reset back to the URL it was at prior to this action: {priorURL}")
                    self.driver.get(priorURL)
                    networkWaitTime += self.waitUntilNoNetworkActivity()
                return networkWaitTime
            else:
                return 0
        except selenium.common.exceptions.TimeoutException:
            return 0

    def checkLoadFailure(self, priorURL):
        try:
            loadFailure = False

            if self.driver.current_url == "data:,":
                loadFailure = True
            elif len(self.getActionMaps()) == 0:
                loadFailure = True

            if loadFailure:
                getLogger().warning(f"The browser session needed to be reset back to the origin url {self.targetURL}")
                self.driver.get(priorURL)
                self.waitUntilNoNetworkActivity()
        except selenium.common.exceptions.TimeoutException:
            pass

    def runAction(self, action):
        actionExecutionTimes = {}
        try:
            if self.hasBrowserDied:
                return None, actionExecutionTimes

            startTime = datetime.now()
            networkWaitTime = self.checkOffsite(priorURL=self.targetURL)
            actionExecutionTimes['checkOffsite-first-networkWaitTime'] = networkWaitTime
            actionExecutionTimes['checkOffsite-first-body'] = ((datetime.now() - startTime).total_seconds() - networkWaitTime)

            executionTrace = ExecutionTrace(id=str(self.executionSession.id) + "_trace_" + str(self.traceNumber))
            executionTrace.actionExecutionTimes = actionExecutionTimes
            executionTrace.time = datetime.now()
            executionTrace.actionPerformed = action
            executionTrace.errorsDetected = []
            executionTrace.actionMaps = self.getActionMaps()
            executionTrace.didErrorOccur = False
            executionTrace.didNewErrorOccur = False
            executionTrace.hadNetworkTraffic = False
            executionTrace.hadNewNetworkTraffic = False
            executionTrace.didCodeExecute = False
            executionTrace.didNewBranchesExecute = False
            executionTrace.didScreenshotChange = False
            executionTrace.isScreenshotNew = False
            executionTrace.tabNumber = self.tabNumber
            executionTrace.traceNumber = self.traceNumber
            executionTrace.browser = self.browser
            executionTrace.userAgent = self.proxy.getUserAgent()
            executionTrace.windowSize = self.windowSize
            executionTrace.executionSessionId = str(self.executionSession.id)
            executionTrace.testingStepId = str(self.executionSession.testingStepId)
            executionTrace.applicationId = str(self.executionSession.applicationId)
            executionTrace.testingRunId = str(self.executionSession.testingRunId)
            executionTrace.owner = self.executionSession.owner

            # Set the execution trace id in the proxy. The proxy will add on headers
            # to all http requests sent by the browser with information identifying
            # which execution trace that particular request is associated with
            self.proxy.setExecutionTraceId(executionTrace.id)

            for plugin in self.plugins:
                startTime = datetime.now()
                plugin.beforeActionRuns(self.driver, self.proxy, self.executionSession, executionTrace, action)
                actionExecutionTimes[f"plugin-before-{type(plugin).__name__}"] = (datetime.now() - startTime).total_seconds()

            startTime = datetime.now()
            success, networkWaitTime = self.performActionInBrowser(action)
            timeTaken = (datetime.now() - startTime).total_seconds()
            actionExecutionTimes[f"performActionInBrowser-body"] = (timeTaken - networkWaitTime)
            actionExecutionTimes[f"performActionInBrowser-networkWaitTime"] = networkWaitTime

            executionTrace.didActionSucceed = success

            startTime = datetime.now()
            networkWaitTime = self.checkOffsite(priorURL=executionTrace.startURL)
            actionExecutionTimes['checkOffsite-second-networkWaitTime'] = networkWaitTime
            actionExecutionTimes['checkOffsite-second-body'] = ((datetime.now() - startTime).total_seconds() - networkWaitTime)

            startTime = datetime.now()
            self.checkLoadFailure(priorURL=executionTrace.startURL)
            actionExecutionTimes['checkLoadFailure'] = (datetime.now() - startTime).total_seconds()

            for plugin in self.plugins:
                startTime = datetime.now()
                plugin.afterActionRuns(self.driver, self.proxy, self.executionSession, executionTrace, action)
                actionExecutionTimes[f"plugin-after-{type(plugin).__name__}"] = (datetime.now() - startTime).total_seconds()

            self.traceNumber += 1

            self.enforceMemoryLimits()

            return executionTrace, actionExecutionTimes
        except urllib3.exceptions.MaxRetryError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during runAction: {traceback.format_exc()}"
            return None, actionExecutionTimes
        except selenium.common.exceptions.WebDriverException:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during runAction: {traceback.format_exc()}"
            return None, actionExecutionTimes
        except urllib3.exceptions.ProtocolError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during runAction: {traceback.format_exc()}"
            return None, actionExecutionTimes

    def screenshotSize(self):
        rect = self.driver.get_window_rect()
        return rect

    def getImage(self):
        try:
            if self.hasBrowserDied:
                return numpy.zeros(shape=[self.config['web_session_height'][self.windowSize], self.config['web_session_width'][self.windowSize], 3])

            image = cv2.imdecode(numpy.frombuffer(self.driver.get_screenshot_as_png(), numpy.uint8), -1)

            image = numpy.flip(image[:, :, :3], axis=2)  # OpenCV always reads things in BGR for some reason, so we have to flip into RGB ordering

            return image
        except urllib3.exceptions.MaxRetryError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during getImage: {traceback.format_exc()}"
            return numpy.zeros(shape=[self.config['web_session_height'][self.windowSize], self.config['web_session_width'][self.windowSize], 3])
        except selenium.common.exceptions.WebDriverException:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during getImage: {traceback.format_exc()}"
            return numpy.zeros(shape=[self.config['web_session_height'][self.windowSize], self.config['web_session_width'][self.windowSize], 3])
        except urllib3.exceptions.ProtocolError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during getImage: {traceback.format_exc()}"
            return numpy.zeros(shape=[self.config['web_session_height'][self.windowSize], self.config['web_session_width'][self.windowSize], 3])
        except AttributeError:
            self.hasBrowserDied = True
            self.browserDeathReason = f"Following fatal error occurred during getImage: {traceback.format_exc()}"
            return numpy.zeros(shape=[self.config['web_session_height'][self.windowSize], self.config['web_session_width'][self.windowSize], 3])

    def runSessionCompletedHooks(self):
        if self.hasBrowserDied:
            return

        for plugin in self.plugins:
            plugin.browserSessionFinished(self.driver, self.proxy, self.executionSession)

