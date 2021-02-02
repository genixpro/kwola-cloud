import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import {withStyles} from "@material-ui/core";
import {store} from "../../redux/store";
import SingleCard from '../Shuffle/singleCard.js';
import BoxCard from '../../components/boxCard';
import Img7 from '../../images/7.jpg';
import user from '../../images/user.jpg';
import htmlIcon from '../../images/icons/html.png';
import javascriptIcon from '../../images/icons/javascript.png';
import pngIcon from '../../images/icons/png.png';
import jpgIcon from '../../images/icons/jpg.png';
import jsonIcon from '../../images/icons/json-file.png';
import fileIcon from '../../images/icons/file.png';
import cssIcon from '../../images/icons/css.png';
import ActionButton from "../../components/mail/singleMail/actionButton";
import {Button} from "../UiElements/Button/button.style";
import Icon from "../../components/uielements/icon";
import moment from 'moment';
import _ from "underscore";
import {Chip, Wrapper} from "../UiElements/Chips/chips.style";
import Avatar from "../../components/uielements/avatars";
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import { Line } from "react-chartjs-2";
import axios from "axios";
import Auth from "../../helpers/auth0/index"
import Tooltip from "../../components/uielements/tooltip";
import Typography from "../../components/uielements/typography";
import { CSVLink, CSVDownload } from "react-csv";
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

import SessionTable from './sessionTable'
import BugsTable from './bugsTable'
import FeedbackWidget from "../FeedbackWidget";
import CircularProgress from "../../components/uielements/circularProgress";
import SettingsIcon from "@material-ui/icons/Settings";
import Menus, {MenuItem} from "../../components/uielements/menus";
import {Link} from "react-router-dom";
import LoaderButton from "../../components/LoaderButton";
import Tabs, { Tab } from '../../components/uielements/tabs';
import BugReportIcon from '@material-ui/icons/BugReport';
import LinearScaleIcon from '@material-ui/icons/LinearScale';
import AppBar from '../../components/uielements/appbar';
import WebIcon from '@material-ui/icons/Web';
import ChangesViewer from "./ChangesViewer";
import { LinearProgress } from '../../components/uielements/progress';
import ResourceTable from "./resourcesTable";
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import "./ViewTestingRun.scss";
import GetAppIcon from '@material-ui/icons/GetApp';
import TransformIcon from '@material-ui/icons/Transform';

class ViewTestingRun extends Component {
    state = {
        result: '',
        csvHeaders:[],
        csvData:[],
        newPage:0,
        setPage:0,
        bugs:[],
        isAdmin: Auth.isAdmin(),
        settingsMenuOpen: false,
        tab: 0,
        resources: [],
        resourceFilter: null
    };

    loadAllData()
    {
        axios.get(`/testing_runs/${this.props.match.params.id}`).then((response) => {
            this.setState({testingRun: response.data.testingRun});

            axios.get(`/resources`, {
                params: {
                    "applicationId": response.data.testingRun.applicationId
                }
            }).then((response) => {
                this.setState({resources: response.data.resources});
            });
        });

        axios.get(`/bugs`, {
            params: {"testingRunId": this.props.match.params.id}
        }).then((response) => {
            this.setState({bugs: response.data.bugs});
            this.formatCSVData()
        });

        axios.get(`/execution_sessions`, {
            params: {
                "testingRunId": this.props.match.params.id,
                "isChangeDetectionSession": false
            }
        }).then((response) => {
            this.setState({executionSessions: response.data.executionSessions});
        });

    }

    componentDidMount()
    {
        this.loadAllData();
    }

    formatCSVData()
    {
        let headers = []
        let data = []
        let bugsClone = [...this.state.bugs];
        bugsClone.map(Bug =>{
            let bug = Object.assign({}, Bug);
            if(headers.length === 0 )
            {
                Object.keys(bug).map(key =>{
                    headers.push({label:key,key:key})
                    
                }) 
            }
            for(let arg in bug)
            {
                if(Array.isArray(bug[arg]) || typeof bug[arg] === "object")
                {
                    bug[arg] = JSON.stringify(bug[arg])
                }
                
            }
            data.push(bug)
        });
        this.setState({csvData:data,csvHeaders:headers})
    }

    restartTestingRunKubeJob()
    {
        return axios.post(`/testing_runs/${this.props.match.params.id}/restart`).then((response) => {

        });
    }

    restartTrainingKubeJob()
    {
        return axios.post(`/testing_runs/${this.props.match.params.id}/restart_training`).then((response) => {

        });
    }

    toggleSettingsMenuOpen(event)
    {
        this.setState({
            settingsMenuOpen: !this.state.settingsMenuOpen,
            applicationSettingsMenuAnchorElement: event.currentTarget
        });
    }

    closeSettingsMenuOpen()
    {
        this.setState({settingsMenuOpen: false});
    }

    pauseTestingRun()
    {
        return axios.post(`/testing_runs/${this.props.match.params.id}/pause`).then((response) => {
            this.loadAllData();
        });
    }

    resumeTestingRun()
    {
        return axios.post(`/testing_runs/${this.props.match.params.id}/resume`).then((response) => {
            this.loadAllData();
        });
    }

    changeTab(evt, newTab)
    {
        this.setState({tab: newTab});
    }


    getHumanFriendlyStatusText(status)
    {
        if (status === "running" || status === "created")
        {
            return "in progress";
        }
        else
        {
            return status;
        }
    }

    iconForResource(resource)
    {
        if (!this.state.selectedResource.contentType)
        {
            return fileIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("text/html") !== -1)
        {
            return htmlIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("application/javascript") !== -1)
        {
            return javascriptIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("image/png") !== -1)
        {
            return pngIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("image/jpeg") !== -1)
        {
            return jpgIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("json") !== -1)
        {
            return jsonIcon;
        }
        else if (this.state.selectedResource.contentType.indexOf("text/css") !== -1)
        {
            return cssIcon;
        }
        else
        {
            return fileIcon;
        }
    }


    setSelectedResource(resource)
    {
        this.setState({
            selectedResource: resource,
            resourceVersions: [],
            loadingResourceVersions: true
        });

        axios.get(`/resource_versions`, {
            params: {
                "resourceId": resource._id
            }
        }).then((response) => {
            this.setState({
                resourceVersions: response.data.resourceVersions,
                loadingResourceVersions: false
            });
        });
    }

    setResourceFilter(filter)
    {
        if (this.state.resourceFilter === filter)
        {
            this.setState({"resourceFilter": null})
        }
        else
        {
            this.setState({"resourceFilter": filter})
        }
    }

    getFilteredResources()
    {
        let filtered = [];
        this.state.resources.map((resource) =>
        {
            if ((resource.contentType && resource.contentType.indexOf(this.state.resourceFilter) !== -1) || !this.state.resourceFilter)
            {
                filtered.push(resource);
            }
        });

        filtered = _.sortBy(filtered, (row) => row.canonicalUrl)

        return filtered;
    }


    render()
    {
        const { result } = this.state;
        const testingTooltip = <Tooltip placement="right-end" title="Info related to this testing run.  View bugs and web browser sessions below.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 

        const bugsTooltip = <Tooltip placement="right-end" title="Listed here are the bugs found in this testing run.  Click on a bug to view the error data and a debug video or download all bugs found to a csv file.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 

        const sessionsTooltip = <Tooltip placement="right-end" title="Listed here are the web browsers opened during this testing run.  Click on an execution to view more.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip>

        const downloadCSVButton = <CSVLink filename="BugsCSV.csv" headers={this.state.csvheaders} data={this.state.csvData}><Icon color="primary" className="fontSizeSmall">get_app</Icon></CSVLink>;

        let zipFileLink = "";
        if (this.state.testingRun)
        {
            zipFileLink = `${process.env.REACT_APP_BACKEND_API_URL}testing_runs/${this.state.testingRun._id}/bugs_zip?token=${Auth.getQueryParameterToken()}`;
        }

        return (
            this.state.testingRun ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <SingleCard src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.state.testingRun.applicationId}/image?token=${Auth.getQueryParameterToken()}`} grid/>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={
                                        <div>
                                            Testing Run
                                            {
                                                this.state.testingRun.status !== "completed" ?
                                                    <div style={{"paddingLeft": "40px", "display": "inline", "position": "relative", "top": "20px"}}>
                                                        <CircularProgress size={28} color="primary"/>
                                                    </div>
                                                    : null
                                            }
                                        </div>}
                                    subtitle={this.getHumanFriendlyStatusText(this.state.testingRun.status)}
                                    button={
                                        <div>
                                            <Button variant="contained"
                                                    size="small"
                                                    color={"default"}
                                                    title={"Settings"}
                                                    aria-owns={this.state.settingsMenuOpen ? 'application-settings-menu' : null}
                                                    aria-haspopup="true"
                                                    onClick={(event) => this.toggleSettingsMenuOpen(event)}
                                            >
                                                <SettingsIcon />
                                            </Button>
                                            <Menus
                                                id="settings-menu"
                                                anchorEl={this.state.applicationSettingsMenuAnchorElement}
                                                open={this.state.settingsMenuOpen}
                                                onClose={() => this.closeSettingsMenuOpen()}
                                            >
                                                <MenuItem><Link to={`/app/dashboard/testing_runs/${this.props.match.params.id}/configuration`} style={{"color":"black", "textDecoration": "none"}}>View Configuration</Link></MenuItem>

                                                {
                                                    this.state.testingRun.status === "completed" ?
                                                        <MenuItem><a
                                                            href={zipFileLink}
                                                            style={{"color": "black", "textDecoration": "none"}}>
                                                            <span>Download Zip of Bugs</span>
                                                        </a></MenuItem>
                                                        : null
                                                }
                                            </Menus>
                                        </div>
                                    }
                                >


                                    <span>Testing Browsers Completed: {this.state.testingRun.testingSessionsCompleted}<br/></span>

                                    {
                                        this.state.testingRun.startTime ?
                                            <span>Start Time: {moment(this.state.testingRun.startTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>
                                            : <span>Start Time: N/A<br/></span>
                                    }

                                    {
                                        this.state.testingRun.endTime ?
                                            <span>End Time: {moment(this.state.testingRun.endTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>
                                            :
                                            this.state.testingRun.predictedEndTime ?
                                            <span>Predicted End Time: {moment(this.state.testingRun.predictedEndTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>
                                            : <span />
                                    }
                                    <br/>
                                    {
                                        this.state.testingRun.status !== "completed" && this.state.testingRun.status !== "failed" ?
                                            <div>
                                                <span>{(100 * this.state.testingRun.testingSessionsCompleted / this.state.testingRun.configuration.totalTestingSessions).toFixed(1)}% completed</span>
                                                <LinearProgress value={100 * this.state.testingRun.testingSessionsCompleted / this.state.testingRun.configuration.totalTestingSessions}
                                                                variant={"determinate"}
                                                />
                                            </div>
                                            : null
                                    }
                                    {
                                        this.state.testingRun.status === "running" ?
                                            <div>
                                                <br/>
                                                <LoaderButton onClick={() => this.pauseTestingRun()}>
                                                    <PauseIcon />
                                                    Pause
                                                </LoaderButton>
                                            </div> : null
                                    }
                                    {
                                        this.state.testingRun.status === "paused" ?
                                            <div>
                                                <br/>
                                                <LoaderButton onClick={() => this.resumeTestingRun()}>
                                                    <PlayArrowIcon />
                                                    Resume
                                                </LoaderButton>
                                            </div> : null
                                    }
                                </Papersheet>
                                <br/>

                                {
                                    this.state.isAdmin && process.env.REACT_APP_DISABLE_ADMIN_VIEW !== "true" ?
                                        <Papersheet title={`Admin`}>
                                            <LoaderButton onClick={() => this.restartTestingRunKubeJob()}>
                                                Restart Testing Run Kube Job
                                                <Icon className="rightIcon">send</Icon>
                                            </LoaderButton>
                                            <LoaderButton onClick={() => this.restartTrainingKubeJob()}>
                                                Restart Training Kube Job
                                                <Icon className="rightIcon">send</Icon>
                                            </LoaderButton>
                                        </Papersheet>
                                        : null
                                }
                                <br/>
                                {
                                    this.state.testingRun.status === "completed" ?
                                        <Papersheet title={`What do you think of the results?`}>
                                            <FeedbackWidget
                                                applicationId={this.state.testingRun.applicationId}
                                                testingRunId={this.state.testingRun._id}
                                                placeholder={"Written Feedback"}
                                                positiveText={"Thumbs up: I liked these results."}
                                                negativeText={"Thumbs down: I didn't like these results."}
                                                screen={"View Testing Run"}
                                            />
                                        </Papersheet>
                                        : null
                                }
                            </HalfColumn>
                        </Row>

                        <Row>
                            <FullColumn>
                                <AppBar position="static" color="default">
                                    <Tabs
                                        value={this.state.tab}
                                        onChange={this.changeTab.bind(this)}
                                        variant="scrollable"
                                        scrollButtons="on"
                                        indicatorColor="primary"
                                        textColor="primary"
                                    >
                                        <Tab label="Bugs" icon={<BugReportIcon />} />
                                        <Tab label="Changes [BETA]" icon={<LinearScaleIcon />} />
                                        <Tab label="Sessions" icon={<WebIcon />} />
                                        <Tab label="Resources" icon={<SystemUpdateAltIcon />} />
                                    </Tabs>
                                </AppBar>

                                {
                                    this.state.tab === 0 ?
                                        <Papersheet style={{"borderRadius": "0"}}>
                                            <span>Total bugs Found: {this.state.bugs ? this.state.bugs.length: "0"}</span><br/>
                                            <span>Download CSV: {downloadCSVButton}</span><br/>
                                            {
                                                this.state.testingRun.status === "completed" ?
                                                    <span>Download Zip File: <a href={zipFileLink}><Icon color="primary" className="fontSizeSmall">get_app</Icon></a></span>
                                                    : null
                                            }
                                            <BugsTable {...this.props} data={this.state.bugs} />
                                        </Papersheet> : null
                                }
                                {
                                    this.state.tab === 1 ?
                                        <Papersheet style={{"borderRadius": "0"}}>
                                            <h1>Changes</h1>

                                            <ChangesViewer testingRun={this.state.testingRun} />
                                        </Papersheet> : null
                                }
                                {
                                    this.state.tab === 2 ?
                                        <Papersheet style={{"borderRadius": "0"}}>
                                            <SessionTable {...this.props} data={this.state.executionSessions} />
                                        </Papersheet> : null
                                }
                                {
                                    this.state.tab === 3 ?
                                        <Papersheet style={{"borderRadius": "0"}}>
                                            <Row>
                                                <Column xs={8}>
                                                    <div className={"resource-filtering-buttons"}>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "text/html" ? "primary" : "default"}
                                                                title={"HTML"}
                                                                onClick={(event) => this.setResourceFilter("text/html")}
                                                        >
                                                            HTML
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "application/javascript" ? "primary" : "default"}
                                                                title={"Javascript"}
                                                                onClick={(event) => this.setResourceFilter("application/javascript")}
                                                        >
                                                            Javascript
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "image/" ? "primary" : "default"}
                                                                title={"Image"}
                                                                onClick={(event) => this.setResourceFilter("image/")}
                                                        >
                                                            Image
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "application/json" ? "primary" : "default"}
                                                                title={"JSON"}
                                                                onClick={(event) => this.setResourceFilter("application/json")}
                                                        >
                                                            JSON
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "text/css" ? "primary" : "default"}
                                                                title={"CSS"}
                                                                onClick={(event) => this.setResourceFilter("text/css")}
                                                        >
                                                            CSS
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "video/" ? "primary" : "default"}
                                                                title={"Video"}
                                                                onClick={(event) => this.setResourceFilter("video/")}
                                                        >
                                                            Video
                                                        </Button>
                                                        <Button variant="contained"
                                                                size="small"
                                                                color={this.state.resourceFilter === "audio/" ? "primary" : "default"}
                                                                title={"Audio"}
                                                                onClick={(event) => this.setResourceFilter("audio/")}
                                                        >
                                                            Audio
                                                        </Button>
                                                    </div>
                                                    <ResourceTable {...this.props}
                                                                   data={this.getFilteredResources()}
                                                                   selectedResource={this.state.selectedResource}
                                                                   onResourceSelected={(resource) => this.setSelectedResource(resource)}
                                                    />
                                                </Column>
                                                <Column xs={4}>
                                                    {
                                                        this.state.selectedResource ?
                                                            <Papersheet className={"resource-info-panel"}>
                                                                <div className={"resource-info-panel-header"}>
                                                                    <h2>{this.state.selectedResource.canonicalUrl}</h2>
                                                                    <br/>
                                                                    <img src={this.iconForResource(this.state.selectedResource)} className={"resource-file-type-icon"} />
                                                                    <br/>
                                                                </div>

                                                                <div className={"resource-details-grid"}>
                                                                    <span className={"resource-detail-label"}>Original URL:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.url || "Unknown"}</span>

                                                                    {
                                                                        this.state.selectedResource.canonicalUrl !== this.state.selectedResource.url ?
                                                                            <span className={"resource-detail-label"}>Canonical URL:</span> : null
                                                                    }
                                                                    {
                                                                        this.state.selectedResource.canonicalUrl !== this.state.selectedResource.url ?
                                                                            <span className={"resource-detail-value"}>{this.state.selectedResource.canonicalUrl || "Unknown"}</span> : null
                                                                    }

                                                                    <span className={"resource-detail-label"}>Content Type:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.contentType || "Unknown"}</span>

                                                                    <span className={"resource-detail-label"}>Creation Date:</span>
                                                                    <span className={"resource-detail-value"}>{moment(this.state.selectedResource.creationDate.$date).format('h:mm:ss a MMM Do, YYYY')}</span>

                                                                    <span className={"resource-detail-label"}>Did Rewrite Resource:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.didRewriteResource.toString()}</span>

                                                                    <span className={"resource-detail-label"}>Rewrite Plugin Name:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.rewritePluginName || "N/A"}</span>

                                                                    <span className={"resource-detail-label"}>Rewrite Mode:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.rewriteMode || "N/A"}</span>

                                                                    <span className={"resource-detail-label"}>Rewrite Message:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.rewriteMessage || "N/A"}</span>

                                                                    <span className={"resource-detail-label"}>Version Save Mode:</span>
                                                                    <span className={"resource-detail-value"}>{this.state.selectedResource.versionSaveMode}</span>
                                                                </div>

                                                                <div className={"resource-versions-list"}>
                                                                    <h4 className={"resource-version-header"}>Recent Versions</h4>
                                                                    {
                                                                        this.state.resourceVersions.map((version) =>
                                                                        {
                                                                            return <div className={"resource-version-row"}>
                                                                                <span>{moment(version.creationDate.$date).format('h:mm:ss a MMM Do, YYYY')}</span>
                                                                                {
                                                                                    (moment(new Date()).diff(moment(version.creationDate.$date)) < (1000 * 60 * 60 * 24 * 45) ) ?
                                                                                        <div>
                                                                                            <a
                                                                                                className={"resource-version-download-icon"}
                                                                                                href={`${process.env.REACT_APP_BACKEND_API_URL}resource_versions/${version._id}/download_original?token=${Auth.getQueryParameterToken()}`}
                                                                                                target="_blank"
                                                                                                title={"Download Original"}>
                                                                                                <GetAppIcon/>
                                                                                            </a>
                                                                                            {
                                                                                                version.didRewriteResource ?
                                                                                                    <a
                                                                                                        className={"resource-version-download-icon"}
                                                                                                        href={`${process.env.REACT_APP_BACKEND_API_URL}resource_versions/${version._id}/download_translated?token=${Auth.getQueryParameterToken()}`}
                                                                                                        target="_blank"
                                                                                                        title={"Download Translated"}>
                                                                                                        <TransformIcon/>
                                                                                                    </a> : null
                                                                                            }
                                                                                        </div> : null
                                                                                }
                                                                            </div>;

                                                                        })
                                                                    }
                                                                    {
                                                                        !this.state.loadingResourceVersions && this.state.resourceVersions.length === 0 ?
                                                                            <div>
                                                                                <span>No resource versions were found.</span>
                                                                            </div> :null
                                                                    }
                                                                </div>
                                                            </Papersheet> : null
                                                    }
                                                </Column>
                                            </Row>
                                        </Papersheet> : null
                                }
                            </FullColumn>
                        </Row>
                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewTestingRun} };
export default connect(mapStateToProps)(ViewTestingRun);

