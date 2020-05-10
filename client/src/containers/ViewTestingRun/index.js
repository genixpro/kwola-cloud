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

        return (
            this.state.testingRun ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <SingleCard src={`http://localhost:8000/api/application/${this.state.testingRun.applicationId}/image`} grid/>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Testing Run`}
                                    // subtitle={}
                                >
                                    <span>Status: {this.state.testingRun.status}<br/></span>

                                    <span>Start Time: {moment(this.state.testingRun.startTime).format('MMM Do, YYYY')}<br/></span>

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
                                <Papersheet title={"Bugs Found"}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Message</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(this.state.bugs || []).map(bug => {
                                                return (
                                                    <TableRow key={bug._id} hover={true} onClick={() => this.props.history.push(`/dashboard/bugs/${bug._id}`)} >
                                                        <TableCell>{bug.error.message}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </Papersheet>
                            </FullColumn>
                        </Row>


                        <Row>
                            <FullColumn>
                                <Papersheet title={"Execution Sessions"}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Session Start Time</TableCell>
                                                <TableCell>Total Reward</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(this.state.executionSessions || []).map(executionSession => {
                                                return (
                                                    <TableRow key={executionSession._id} hover={true} onClick={() => this.props.history.push(`/dashboard/execution_sessions/${executionSession._id}`)} >
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

