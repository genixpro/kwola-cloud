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
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import { Line } from "react-chartjs-2";
import axios from "axios";
import Auth from "../../helpers/auth0/index"
import Tooltip from "../../components/uielements/tooltip";
import Typography from "../../components/uielements/typography";

class ViewTestingRun extends Component {
    state = {
        result: '',
    };

    componentDidMount() {
        axios.get(`/testing_runs/${this.props.match.params.id}`).then((response) => {
            this.setState({testingRun: response.data.testingRun});
        });

        axios.get(`/bugs`, {
            params: {"testingRunId": this.props.match.params.id}
        }).then((response) => {
            this.setState({bugs: response.data.bugs});
        });

        axios.get(`/execution_sessions`, {
            params: {"testingRunId": this.props.match.params.id}
        }).then((response) => {
            this.setState({executionSessions: response.data.executionSessions});
        });
    }


    render() {
        const { result } = this.state;
        const testingTooltip = <Tooltip placement="right-end" title="Info related to this testing run.  View bugs and web browser sessions below.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 

        const bugsTooltip = <Tooltip placement="right-end" title="Listed here are the bugs found in this testing run.  Click on a bug to view the error data and a debug video.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 

        const sessionsTooltip = <Tooltip placement="right-end" title="Listed here are the web browsers opened during this testing run.  Click on an execution to view more.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip>
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
                                            <span>Start Time: {moment(this.state.testingRun.startTime).format('MMM Do, YYYY')}<br/></span>
                                            : <span>Start Time: N/A<br/></span>
                                    }

                                    {
                                        this.state.testingRun.endTime ?
                                            <span>End Time: {moment(this.state.testingRun.endTime).format('MMM Do, YYYY')}<br/></span>
                                            : <span>End Time: N/A<br/></span>
                                    }
                                </Papersheet>
                            </HalfColumn>
                        </Row>

                        <Row>
                            <FullColumn>
                                <Papersheet title={"Bugs Found"} tooltip={bugsTooltip}>
                                    <span>Total bugs Found: {this.state.bugs ? this.state.bugs.length: "0"}</span>
                                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word"}}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Message</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                        
                                            {(this.state.bugs || []).map(bug => {
                                                return (
                                                    
                                                    <TableRow key={bug._id} hover={true} onClick={() => this.props.history.push(`/app/dashboard/bugs/${bug._id}`)} >
                                                        <TableCell>{bug.error.message}</TableCell>
                                                    </TableRow>
                                                    
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </Papersheet>
                            </FullColumn>
                        </Row>


                        <Row>
                            <FullColumn>
                                <Papersheet title={"Web Browsers"} tooltip={sessionsTooltip}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Browser Start Time</TableCell>
                                                <TableCell>Total Reward</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(this.state.executionSessions || []).map(executionSession => {
                                                return (
                                                    <TableRow key={executionSession._id} hover={true} onClick={() => this.props.history.push(`/app/dashboard/execution_sessions/${executionSession._id}`)} >
                                                        <TableCell>{executionSession.startTime ? moment(new Date(executionSession.startTime.$date)).format('HH:mm MMM Do') : null}</TableCell>
                                                        <TableCell>{executionSession.totalReward}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
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

