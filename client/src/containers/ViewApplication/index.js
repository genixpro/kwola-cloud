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
import {Chip, Wrapper} from "../UiElements/Chips/chips.style";
import Avatar from "../../components/uielements/avatars";
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import axios from "axios";
import Auth from "../../helpers/auth0/index"

class ViewApplication extends Component {
    state = {
        result: '',
    };

    componentDidMount()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({application: response.data})
        });


        axios.get(`/testing_runs`).then((response) =>
        {
            this.setState({testingRuns: response.data.testingRuns})
        });
    }

    launchTestingSequenceButtonClicked()
    {
        this.props.history.push(`/dashboard/applications/${this.props.match.params.id}/new_testing_run`);
    }

    render() {
        const { result } = this.state;
        return (
                this.state.application ?
                    <LayoutWrapper>
                        <FullColumn>
                            <Row>
                                <HalfColumn>
                                    <SingleCard src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.props.match.params.id}/image?token=${Auth.getQueryParameterToken()}`} grid/>
                                </HalfColumn>

                                <HalfColumn>
                                    <Papersheet
                                        title={`${this.state.application.name}`}
                                        subtitle={`Last Tested ${moment(this.props.timestamp).format('MMM Do, YYYY')}`}
                                    >
                                        {/*<Row>*/}
                                        {/*<HalfColumn>*/}
                                        {/*    <div>*/}
                                        {/*        Learning:*/}
                                        {/*        <Chip*/}
                                        {/*            avatar={<Icon style={{ fontSize: 22 }}>info-outline</Icon>}*/}
                                        {/*            label="In Progress"*/}
                                        {/*        />*/}
                                        {/*    </div>*/}
                                        {/*</HalfColumn>*/}
                                        {/*<HalfColumn>*/}
                                        {/*    <div>*/}
                                        {/*        Testing:*/}
                                        {/*        <Chip*/}
                                        {/*            avatar={<Icon style={{ fontSize: 22 }}>info-outline</Icon>}*/}
                                        {/*            label="In Progress"*/}
                                        {/*        />*/}
                                        {/*    </div>*/}
                                        {/*</HalfColumn>*/}
                                        {/*</Row>*/}
                                        <Row>
                                        <FullColumn>
                                                <DemoWrapper>
                                                    <Button variant="extended" color="primary" onClick={() => this.launchTestingSequenceButtonClicked()}>
                                                        Launch New Testing Run
                                                        <Icon className="rightIcon">send</Icon>
                                                    </Button>
                                                </DemoWrapper>
                                        </FullColumn>
                                        </Row>
                                    </Papersheet>
                                </HalfColumn>
                            </Row>


                            <Row>
                                <FullColumn>
                                    <Papersheet title={"Recent Testing Runs"}>


                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Test Start Time</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    {/*<TableCell>Test Finish Time</TableCell>*/}
                                                    <TableCell>Bug Found</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>

                                                {(this.state.testingRuns || []).map(testingRun => {
                                                    return (
                                                        <TableRow key={testingRun._id} hover={true} onClick={() => this.props.history.push(`/dashboard/testing_runs/${testingRun._id}`)}>
                                                            <TableCell>{moment(testingRun.startTime).format('HH:mm MMM Do')}</TableCell>
                                                            <TableCell>{testingRun.status}</TableCell>
                                                            {/*<TableCell>{testingRun.endDate}</TableCell>*/}
                                                            <TableCell>{testingRun.bugsFound}</TableCell>
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

const mapStateToProps = (state) => {return { ...state.ViewApplication} };
export default connect(mapStateToProps)(ViewApplication);

