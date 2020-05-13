import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import Auth from "../../helpers/auth0/index"

class ViewBug extends Component {
    state = {
        result: '',
    };

    componentDidMount()
    {
        axios.get(`/bugs/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({bug: response.data.bug})
        });
    }


    render() {
        const { result } = this.state;

        return (
            this.state.bug ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <Papersheet>
                                    <video controls style={{"width": "100%"}}>
                                        <source src={`${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.state.bug._id}/video?token=${Auth.getQueryParameterToken()}`} type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                </Papersheet>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Bug ${this.state.bug._id}`}
                                    // subtitle={}
                                >
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.message}</pre>
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.stacktrace}</pre>
                                </Papersheet>
                            </HalfColumn>
                        </Row>
                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewBug} };
export default connect(mapStateToProps)(ViewBug);

