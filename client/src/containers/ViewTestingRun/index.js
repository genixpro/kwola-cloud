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
        tab: 0
    };

    loadAllData()
    {
        axios.get(`/testing_runs/${this.props.match.params.id}`).then((response) => {
            this.setState({testingRun: response.data.testingRun});
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
                                    subtitle={this.state.testingRun.status}
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

