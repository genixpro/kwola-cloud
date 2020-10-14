import AddIcon from '@material-ui/icons/Add';
import AlarmIcon from '@material-ui/icons/Alarm';
import AppBar from '../../components/uielements/appbar';
import Checkbox from '../../components/uielements/checkbox';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CodeIcon from '@material-ui/icons/Code';
import DeleteIcon from '@material-ui/icons/Delete';
import Icon from "../../components/uielements/icon";
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import React, { Component } from 'react';
import ScheduleIcon from '@material-ui/icons/Schedule';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import Tabs, { Tab } from '../../components/uielements/tabs';
import TextField from '../../components/uielements/textfield';
import Snackbar from '../../components/uielements/snackbar';
import Typography from '../../components/uielements/typography';
import Modal from '../../components/uielements/modals';
import TextFieldMargins from "../UiElements/TextFields/layout";
import axios from "axios";
import _ from "underscore";
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import {connect, Provider} from 'react-redux';
import Auth0 from '../../helpers/auth0';
import Promise from "bluebird";
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import {PaymentRequestButtonElement, CardElement, useStripe, useElements, ElementsConsumer} from "@stripe/react-stripe-js";
import stripePromise from "../../stripe";
import mixpanel from 'mixpanel-browser';
import SnackAlert from '@material-ui/lab/Alert';
import LoaderButton from "../../components/LoaderButton";
import FeedbackWidget from "../FeedbackWidget";
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import AutologinCredentials from "../NewTestingRun/AutologinCredentials";
import ErrorsConfiguration from "../NewTestingRun/ErrorsConfiguration";
import PathWhitelistConfiguration from "../NewTestingRun/PathWhitelistConfiguration";
import PaymentDetailsSection from "../NewTestingRun/PaymentDetailsSection";
import RecurringTestingOptions from "./RecurringTestingTriggerOptions";
import SizeOfRun from "../NewTestingRun/SizeOfRun";
import CheckoutWidget from "../NewTestingRun/CheckoutPriceWidget";
import DoneIcon from "@material-ui/icons/Done";
import "./NewRecurringTestingTrigger.scss";


class NewRecurringTestingTrigger extends Component {
    state = {
        result: '',
        snackbar:false,
        snackbarSeverity:"info",
        promoCode: "",
        discountApplied: 0
    };

    constructor()
    {
        super();
    }


    componentDidMount()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            const stateUpdate = {application: response.data};

            this.setState(stateUpdate);
        });
    }


    createDataForRecurringTestingTrigger()
    {
        return {
            applicationId: this.props.match.params.id,
            promoCode: this.state.promoCode,
            repeatTrigger: this.state.repeatTrigger,
            repeatFrequency: this.state.repeatFrequency,
            repeatUnit: this.state.repeatUnit,
            hoursEnabled: this.state.hoursEnabled,
            daysOfWeekEnabled: this.state.daysOfWeekEnabled,
            datesOfMonthEnabled: this.state.datesOfMonthEnabled,
            repositoryURL: this.state.repositoryURL,
            repositoryUsername: this.state.repositoryUsername,
            repositoryPassword: this.state.repositoryPassword,
            repositorySSHPrivateKey: this.state.repositorySSHPrivateKey,
            webhookIdentifier: this.state.webhookIdentifier
        };
    }

    createTriggerClicked()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'clicked-create-trigger'});
        }

        const recurringTestingTriggerData = this.createDataForRecurringTestingTrigger();

        // testingRunData['stripe'] = {productId:this.state.productId, priceId:this.}
        return axios.post(`/recurring_testing_trigger`, recurringTestingTriggerData).then((response) => {
            this.setState({
                snackbarSeverity: "success",
                snackbar: true,
                snackbarText: 'Your recurring testing has been setup successfully!'
            })
            this.trackTriggerCreateSuccess(response.data.recurringTestingTriggerId);
            this.props.history.push(`/app/dashboard/triggers/${response.data.recurringTestingTriggerId}`);
        }, (error) =>
        {
            this.setState({
                snackbarSeverity:"warning",
                snackbar:true,
                snackbarText:'Order failed. Your recurring testing could not be setup. Please ensure your payment method is valid or contact support.'
            })
            this.trackTriggerCreateFailure();
            return Promise.rejected(error);
        });
    }

    closeSnackbar()
    {
        this.setState({snackbar:false});
    }


    trackTriggerCreateSuccess(recurringTestingTriggerId)
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'setup-recurring-trigger-success', 'conversionValue': 250});
        }
    }

    trackTriggerCreateFailure()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'setup-recurring-trigger-failure', 'conversionValue': 250});
        }
    }


    render()
    {
        const { result } = this.state;

        if (!this.state.application)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <Column>
                            <div>
                                <Papersheet
                                    title={`Trigger Options`}
                                    subtitle={``}
                                >
                                    <RecurringTestingOptions
                                        onChange={(data) => this.setState(data)}
                                        hideFrame={true}
                                    />
                                    <Row>
                                        <Column>
                                            <LoaderButton onClick={() => this.createTriggerClicked()} className={"create-trigger-button"}>
                                                Create Trigger
                                            </LoaderButton>
                                        </Column>
                                    </Row>
                                </Papersheet>

                            </div>
                        </Column>
                    </Row>
                    <Row>
                        <Column>
                            <Papersheet title={`Did you like this page to create your trigger?`}>
                                <FeedbackWidget
                                    applicationId={this.props.match.params.id}
                                    positivePlaceholder={"What did you like about it?"}
                                    negativePlaceholder={"How could we make it better?"}
                                    screen={"New Testing Run"}
                                    positiveText={"Thumbs up: I like this trigger creation page."}
                                    negativeText={"Thumbs down: I find this confusing."}
                                />
                            </Papersheet>
                        </Column>
                    </Row>
                </FullColumn>
                <Snackbar
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    onClick={() => this.closeSnackbar()}
                    open={this.state.snackbar}
                    autoHideDuration={6000}
                    timeout={6000}
                    //message={this.state.snackbarText ?? ""}
                >
                    <SnackAlert severity={this.state.snackbarSeverity}>
                        {this.state.snackbarText ?? ""}
                    </SnackAlert>
                </Snackbar>
            </LayoutWrapper>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewRecurringTestingTrigger} };
export default connect(mapStateToProps)(NewRecurringTestingTrigger);

