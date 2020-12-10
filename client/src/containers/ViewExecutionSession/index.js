import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import {withStyles} from "@material-ui/core";
import action from "../../redux/ViewExecutionSession/actions";
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
import Auth from "../../helpers/auth0/index"
import ActionList from "../ActionList/index";
import edgeBlackSquare from "../../images/edge-black-square.png"
import axios from "axios";

class ViewExecutionSession extends Component {
    state = {
        result: '',
    };

    componentDidMount()
    {
        axios.get(`/execution_sessions/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({executionSession: response.data.executionSession})
        });

        axios.get(`/execution_sessions/${this.props.match.params.id}/traces`).then((response) =>
        {
            this.setState({executionTraces: response.data.executionTraces})
        });
    }


    render() {
        const { result } = this.state;

        return (
            this.state.executionSession ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <Papersheet>
                                    <video controls style={{"width": "100%"}}>
                                        <source src={`${process.env.REACT_APP_BACKEND_API_URL}execution_sessions/${this.state.executionSession._id}/video?token=${Auth.getQueryParameterToken()}`} type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                </Papersheet>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Web Browser ${this.state.executionSession._id}`}
                                    // subtitle={}
                                >

                                    <span>Start Time: {moment(this.state.executionSession.startTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>

                                    {
                                        this.state.executionSession.endTime ?
                                            <span>End Time: {moment(this.state.executionSession.endTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>
                                            : <span>End Time: N/A<br/></span>
                                    }
                                    {
                                        this.state.executionSession.browser === "chrome" ?
                                            <span>Browser: <i className="devicon-chrome-plain" style={{"fontSize":"20px", "position": "relative", "top": "2px"}} /> Chrome<br/><br/></span> : null
                                    }
                                    {
                                        this.state.executionSession.browser === "firefox" ?
                                            <span>Browser: <i className="devicon-firefox-plain" style={{"fontSize":"20px", "position": "relative", "top": "2px"}} /> Firefox<br/><br/></span> : null
                                    }
                                    {
                                        this.state.executionSession.browser === "edge" ?
                                            <span>Browser: <img src={edgeBlackSquare}  style={{"width":"20px", "fontSize":"20px", "position": "relative", "top": "2px"}} /> Edge<br/><br/></span> : null
                                    }
                                    {
                                        this.state.executionSession.userAgent ?
                                            <span>User Agent: {this.state.executionSession.userAgent}<br/><br/></span> : null
                                    }
                                    {
                                        this.state.executionSession.windowSize ?
                                            <span>Window Size: {this.state.executionSession.windowSize}<br/><br/></span> : null
                                    }
                                </Papersheet>
                            </HalfColumn>
                        </Row>

                        <Row>
                            <FullColumn>
                                <Papersheet title={"Execution Traces"}>
                                    <ActionList executionTraces={this.state.executionTraces} />
                                </Papersheet>
                            </FullColumn>
                        </Row>

                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewExecutionSession} };
export default connect(mapStateToProps)(ViewExecutionSession);

