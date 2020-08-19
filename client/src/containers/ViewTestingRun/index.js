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

import SessionTable from './sessionTable'
import BugsTable from './bugsTable'

class ViewTestingRun extends Component {
    state = {
        result: '',
        csvHeaders:[],
        csvData:[],
        newPage:0,
        setPage:0,
        bugs:[],
        isAdmin: Auth.isAdmin()
    };

    componentDidMount() {
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
            params: {"testingRunId": this.props.match.params.id}
        }).then((response) => {
            this.setState({executionSessions: response.data.executionSessions});
        });
    }

    formatCSVData(){
        let headers = []
        let data = []
        let bugsClone = [...this.state.bugs];
        bugsClone.map(Bug =>{
            let bug = Object.assign({}, Bug);
            if(headers.length == 0 ){
                Object.keys(bug).map(key =>{
                    headers.push({label:key,key:key})
                    
                }) 
            }
            for(let arg in bug){
                if(Array.isArray(bug[arg]) || typeof bug[arg] === "object"){
                    bug[arg] = JSON.stringify(bug[arg])
                }
                
            }
            data.push(bug)
        });
        this.setState({csvData:data,csvHeaders:headers})
    }

    restartTestingRunKubeJob()
    {
        if (window.confirm("Are you sure you want to restart the kube job? This will cause problems if there is already a kube job running for this testing run."))
        {
            axios.post(`/testing_runs/${this.props.match.params.id}/restart`).then((response) => {
                window.alert("Successfully restarted Kube job");
            });
        }
    }

    render() {
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
                                    title={`Testing Run`}
                                    subtitle={this.state.testingRun.status}
                                    tooltip={testingTooltip}
                                >

                                    <span>Testing Browsers Completed: {this.state.testingRun.testingSessionsCompleted}<br/></span>

                                    <span># of Actions per Browser: {this.state.testingRun.configuration.testingSequenceLength}<br/></span>

                                    {
                                        this.state.testingRun.startTime ?
                                            <span>Start Time: {moment(this.state.testingRun.startTime.$date).format('MMM Do, YYYY')}<br/></span>
                                            : <span>Start Time: N/A<br/></span>
                                    }

                                    {
                                        this.state.testingRun.endTime ?
                                            <span>End Time: {moment(this.state.testingRun.endTime).format('MMM Do, YYYY')}<br/></span>
                                            : <span>End Time: N/A<br/></span>
                                    }
                                </Papersheet>
                                <br/>

                                {
                                    this.state.isAdmin ?
                                        <Papersheet title={`Admin`}>
                                            <Button variant="extended" color="primary"
                                                    onClick={() => this.restartTestingRunKubeJob()}>
                                                Restart Testing Run Kube Job
                                                <Icon className="rightIcon">send</Icon>
                                            </Button>
                                        </Papersheet>
                                        : null
                                }
                            </HalfColumn>
                        </Row>

                        <Row>
                            <FullColumn>
                                <Papersheet title={"Bugs Found"} tooltip={bugsTooltip}>
                                    <span>Total bugs Found: {this.state.bugs ? this.state.bugs.length: "0"}</span><br/>
                                    <span>Download CSV: {downloadCSVButton}</span><br/>
                                    <BugsTable {...this.props} data={this.state.bugs} />
                                </Papersheet>
                            </FullColumn>
                        </Row>


                        <Row>
                            <FullColumn>
                                <Papersheet title={"Web Browsers"} tooltip={sessionsTooltip}>
                                   <SessionTable {...this.props} data={this.state.executionSessions} />
                                </Papersheet>
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

