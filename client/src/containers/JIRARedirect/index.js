import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import 'plyr/dist/plyr.css'
import {FormControlLabel, FormGroup} from "../../components/uielements/form";
import Checkbox from "../../components/uielements/checkbox";
import LoaderButton from "../../components/LoaderButton";
import Input from "../../components/uielements/input";
import {MenuItem} from "../../components/uielements/menus";
import {Select} from "../UiElements/Select/select.style";
import {FormControl, InputLabel} from "@material-ui/core";
import Promise from "bluebird";
import TextField from "../../components/uielements/textfield";
import Auth from "../../helpers/auth0/index"
import _ from "underscore";

// InputLabel


class ConfigureNotifications extends Component {
    state = {
        application: null,
        availableSlackChannels: []
    };

    componentDidMount()
    {
        if (window.location.search)
        {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('code'))
            {
                const applicationId = urlParams.get('state');
                axios.post(`/application/${applicationId}/jira`, {
                    "code": urlParams.get("code"),
                    "redirect_uri": this.computeJIRARedirectURI()
                }).then((response) =>
                {
                    this.props.history.push(`/app/dashboard/applications/${applicationId}/integrations`);
                });
            }
        }
    }

    computeJIRARedirectURI()
    {
        return process.env.REACT_APP_FRONTEND_URL + "app/dashboard/jira";
    }

    render() {
        return (
            <LayoutWrapper>

            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureNotifications} };
export default connect(mapStateToProps)(ConfigureNotifications);

