import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import {withStyles} from "@material-ui/core";
import action from "../../redux/ViewExecutionTrace/actions";
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

class ViewExecutionTrace extends Component {
    state = {
        result: '',
    };

    componentDidMount()
    {
        axios.get(`/execution_sessions/${this.props.match.id}/traces/${this.props.match.traceId}`).then((response) =>
        {
            this.setState({executionTrace: response.data.executionTrace})
        })
    }


    render() {
        const { result } = this.state;

        return (
            this.props.executionTrace ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <FullColumn>
                                <Papersheet
                                    title={`Execution Trace ${this.state.executionTrace._id}`}
                                    // subtitle={}
                                >

                                    <pre>
                                        {JSON.stringify(this.state.executionTrace, null, 4)}
                                    </pre>

                                </Papersheet>
                            </FullColumn>
                        </Row>
                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewExecutionTrace} };
export default connect(mapStateToProps)(ViewExecutionTrace);

