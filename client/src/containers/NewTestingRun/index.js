import AddIcon from '@material-ui/icons/Add';
import AlarmIcon from '@material-ui/icons/Alarm';
import AppBar from '../../components/uielements/appbar';
import Checkbox from '../../components/uielements/checkbox';
import CheckoutPageWrapper, {RunTypes} from "./checkout.style.js";
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
import ActionsConfiguration from "./ActionsConfiguration";
import AutologinCredentials from "./AutologinCredentials";
import ErrorsConfiguration from "./ErrorsConfiguration";
import PathWhitelistConfiguration from "./PathWhitelistConfiguration";
import PaymentDetailsSection from "./PaymentDetailsSection";
import RecurringTestingOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import SizeOfRun from "./SizeOfRun";
import CheckoutWidget from "./CheckoutPriceWidget";



class NewTestingRun extends Component {
    state = {
        result: '',
        paymentRequest: null,
        mode: "details",
        name: "",
        address: "",
        snackbar:false,
        snackbarSeverity:"info",
        promoCode: "",
        discountApplied: 0,
        runConfiguration: {}
    };

    constructor()
    {
        super();

        // window.ga('event', 'optimize.callback', {
        //     name: 'qvH9plMMQYqYS5d_13VXcA',
        //     callback: (value) => this.setState({variant: value})
        // });

        this.checkoutWidget = null;
    }


    componentDidMount()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            const stateUpdate = {application: response.data};
            if (response.data.defaultRunConfiguration)
            {
                stateUpdate.runConfiguration = response.data.defaultRunConfiguration;
            }
            
            this.setState(stateUpdate);
        });
    }


    createRunConfiguration()
    {
        const runConfig = this.state.runConfiguration;
        runConfig.url = this.state.application.url;
        runConfig.name = "";
        runConfig.paragraph = "";
        runConfig.preventOffsiteLinks = true;
        return runConfig;
    }

    createDataForTestingRun()
    {
        const runConfig = this.createRunConfiguration();
        return {
            applicationId: this.props.match.params.id,
            promoCode: this.state.promoCode,
            configuration: runConfig
        };
    }

    changeRunConfiguration(newValues)
    {
        const runConfig = this.state.runConfiguration;
        Object.keys(newValues).forEach((key) =>
        {
            runConfig[key] = newValues[key];
        });
        this.setState({runConfiguration: runConfig})
    }

    trackOrderSuccess(testingRunId, price)
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'complete-order-success', 'conversionValue': price});
        }
    }

    trackOrderFailure(price)
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'complete-order-error', 'conversionValue': price});
        }

    }

    launchTestingRunButtonClicked()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            window.dataLayer.push({'event': 'clicked-launch-testing-run'});
        }


        if (Auth0.isUserAllowedFreeRuns() || this.checkoutWidget.calculateFinalTotal() === 0)
        {
            this.launchTestingRun(null);
        }
        else
        {
            this.setState({"mode": "payment"});
        }
    }


    launchTestingRun(paymentMethod)
    {
        let price = this.checkoutWidget.calculateFinalTotal();
        if (Auth0.isUserAllowedFreeRuns() || paymentMethod === null)
        {
            price = 0;
        }

        const testingRunData = this.createDataForTestingRun();

        if(paymentMethod !== null)
        {
            testingRunData['payment_method'] = paymentMethod.id;
        }

        // testingRunData['stripe'] = {productId:this.state.productId, priceId:this.}
        return axios.post(`/testing_runs`, testingRunData).then((response) => {
            this.setState({
                snackbarSeverity:"success",
                snackbar:true,
                snackbarText:'Order completed successfully. Your Testing run will begin soon.'
            })
            this.trackOrderSuccess(response.data.testingRunId, price);
            this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
        }, (error) =>
        {
            this.setState({
                snackbarSeverity:"warning",
                snackbar:true,
                snackbarText:'Order failed. Testing run could not start. Please ensure your payment method is valid or contact support.'
            })
            this.trackOrderFailure(price);
            return Promise.rejected(error);
        });
    }


    completeOrderClicked(elements)
    {
        const price = this.checkoutWidget.calculatePrice();
        return stripePromise.then((stripe) =>
        {
            const cardElement = elements.getElement(CardElement);

            return stripe.createPaymentMethod({
                type: "card",
                card: cardElement,
                billing_details: {
                    name: this.state.name,
                    address: this.state.address
                }
            }).then((result) =>
            {
                if (result.error)
                {
                    // Show error to your customer (e.g., insufficient funds)
                    this.setState({snackbarSeverity:"warning",snackbar:true,snackbarText:'Processing Error. Please check your payment information and try again.'})
                    this.trackOrderFailure(price);
                    return Promise.rejected(result.error);
                }
                else
                {
                    this.launchTestingRun(result.paymentMethod);
                }
            });
        })
    }

    closeSnackbar()
    {
        this.setState({snackbar:false});
    }


    checkoutButtonClicked(elements)
    {
        if (this.state.mode === 'details')
        {
            return this.launchTestingRunButtonClicked();
        }

        if (this.state.mode === 'payment')
        {
            return this.completeOrderClicked(elements)
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
                    <ElementsConsumer>
                        {({elements, stripe}) => (
                            <FullColumn>
                                <Row>
                                    {
                                        this.state.mode === "details" ?
                                            <TwoThirdColumn>
                                                <div>
                                                    <SizeOfRun
                                                        defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                                        onChange={(data) => this.changeRunConfiguration(data)}
                                                    />
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <AutologinCredentials
                                                        defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                                        onChange={(data) => this.changeRunConfiguration(data)}
                                                    />
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <ActionsConfiguration
                                                        defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                                        onChange={(data) => this.changeRunConfiguration(data)}
                                                    />
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <PathWhitelistConfiguration
                                                        defaultRunConfiguration={this.state.application.defaultRunConfiguration}
                                                        onChange={(data) => this.changeRunConfiguration(data)}
                                                        application={this.state.application}
                                                    />
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <ErrorsConfiguration onChange={(data) => this.changeRunConfiguration(data)} />
                                                </div>
                                        </TwoThirdColumn> : null
                                    }

                                    {
                                        this.state.mode === "payment" ?
                                            <TwoThirdColumn>
                                                <PaymentDetailsSection onChange={(data) => this.setState(data)} />
                                            </TwoThirdColumn> : null
                                    }

                            <OneThirdColumn>
                                <div style={{"position":"sticky", "top":"5vh"}}>
                                    <Papersheet
                                        title={`Checkout`}
                                        subtitle={``}
                                    >
                                        <CheckoutWidget
                                            objRef={(elem) => this.checkoutWidget = elem}
                                            runConfiguration={this.state.runConfiguration}
                                            onCheckoutButtonClicked={() => this.checkoutButtonClicked(elements)}
                                            onChange={(data) => this.setState(data)}
                                            checkoutButtonText={this.state.mode === 'details' ? 'Launch Testing Run' : 'Complete Order'}
                                        />
                                    </Papersheet>
                                    <br/>
                                    <Papersheet title={`Did you like this checkout page?`}>
                                        <FeedbackWidget
                                            applicationId={this.props.match.params.id}
                                            positivePlaceholder={"What did you like about it?"}
                                            negativePlaceholder={"How could we make it better?"}
                                            screen={"New Testing Run"}
                                            positiveText={"Thumbs up: I like this checkout page."}
                                            negativeText={"Thumbs down: I find this confusing or don't like the price."}
                                        />
                                    </Papersheet>
                                </div>
                            </OneThirdColumn>
                        </Row>
                    </FullColumn>
                            )}
                    </ElementsConsumer>
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

const mapStateToProps = (state) => {return { ...state.NewTestingRun} };
export default connect(mapStateToProps)(NewTestingRun);

