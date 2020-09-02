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
import RecurringOptions from "./RecurringRunOptions";
import SizeOfRun from "./SizeOfRun";




function addCommas(value)
{
    const regex = /(\d+)(\d\d\d)/g;
    while(regex.test(value))
    {
        value = value.toString().replace(regex, "$1,$2");
    }
    return value
}




class NewTestingRun extends Component {
    state = {
        result: '',
        tab: 0,
        paymentRequest: null,
        mode: "details",
        name: "",
        address: "",
        snackbar:false,
        snackbarSeverity:"info",
        promoCode: "",
        discountApplied: 0
    };

    constructor()
    {
        super();

        window.ga('event', 'optimize.callback', {
            name: 'qvH9plMMQYqYS5d_13VXcA',
            callback: (value) => this.setState({variant: value})
        });
    }


    componentDidMount()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({application: response.data})
        });
    }


    createDataForTestingRun()
    {
        return {
            applicationId: this.props.match.params.id,
            promoCode: this.state.promoCode,
            configuration: {
                url: this.state.application.url,
                email: this.state.email,
                password: this.state.password,
                name: "",
                paragraph: "",
                enableRandomNumberCommand: this.state.enableRandomNumbers,
                enableRandomBracketCommand: this.state.enableRandomBrackets,
                enableRandomMathCommand: this.state.enableRandomMathSymbols,
                enableRandomOtherSymbolCommand: this.state.enableRandomOtherSymbols,
                enableDoubleClickCommand: this.state.enableDoubleClick,
                enableRightClickCommand: this.state.enableRightClick,
                autologin: this.state.autologin,
                preventOffsiteLinks: true,
                urlWhitelistRegexes: this.state.pathRegexes,
                testingSequenceLength: this.state.length,
                totalTestingSessions: this.state.sessions,
                hours: this.state.hours
            }
        };
    }

    trackOrderSuccess(testingRunId, price)
    {

        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            var _hsq = window._hsq = window._hsq || [];
            mixpanel.track("complete-order-success", {testingRunId: testingRunId, price: price});
            mixpanel.people.track_charge(price)
            _hsq.push(["trackEvent", {
                id: "Completed Order",
                value: price
            }]);
            
            window.ga('send', 'event', "order-testing-run", "success", "", price);
        }

    }

    trackOrderFailure(price)
    {

        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            var _hsq = window._hsq = window._hsq || [];
            mixpanel.track("complete-order-error", {price: price});
            _hsq.push(["trackEvent", {id: "Failed Order"}]);
            this.setState({snackbar:true,snackbarText:'Order failed.'})
            window.ga('send', 'event', "order-testing-run", "failed", "", price);
        }

    }

    launchTestingRunButtonClicked()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            mixpanel.track("clicked-launch-testing-run");
            var _hsq = window._hsq = window._hsq || [];
            _hsq.push(["trackEvent", {id: "Clicked Launch Testing Run"}]);
            window.ga('send', 'event', "launch-testing-run", "click");
        }


        if (Auth0.isUserAllowedFreeRuns() || this.calculateFinalTotal() === 0)
        {
            const testingRunData = this.createDataForTestingRun();
            const price = 0;
                
            return axios.post(`/testing_runs`, testingRunData).then((response) => {
                this.setState({snackbarSeverity:"success",snackbar:true,snackbarText:'Free Run completed successfully. Testing run will begin soon.'})
                this.trackOrderSuccess(response.data.testingRunId, price);
                this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
            }, (error) =>
            {   
                this.setState({snackbarSeverity:"warning",snackbar:true,snackbarText:'Order failed. Testing run could not start.'})
                this.trackOrderFailure(price);
                return Promise.rejected(error);
            });
        }
        else
        {
            this.setState({"mode": "payment"});
        }
    }

    calculatePrice()
    {
        return Math.max(1.00, Number((this.state.length * this.state.sessions * 0.001).toFixed(2)));
    }


    calculateDiscount()
    {
        return this.calculatePrice() * this.state.discountApplied;
    }


    calculateFinalTotal()
    {
        return this.calculatePrice() * (1.0 - this.state.discountApplied);
    }


    completeOrder(elements)
    {
        const price = this.calculatePrice();
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
                    const testingRunData = this.createDataForTestingRun();
                    testingRunData['payment_method'] = result.paymentMethod.id;
                    // testingRunData['stripe'] = {productId:this.state.productId, priceId:this.}
                    return axios.post(`/testing_runs`, testingRunData).then((response) => {
                        this.setState({snackbarSeverity:"success",snackbar:true,snackbarText:'Order completed successfully. Your Testing run will begin soon.'})
                        this.trackOrderSuccess(response.data.testingRunId, price);
                        this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
                    }, (error) =>
                    {
                        this.setState({snackbarSeverity:"warning",snackbar:true,snackbarText:'Order failed. Testing run could not start. Please ensure your payment method is valid or contact support.'})
                        this.trackOrderFailure(price);
                        return Promise.rejected(error);
                    });
                }
            });
        })
    }

    closeSnackbar()
    {
        this.setState({snackbar:false});
    }

    changePromoCode(newValue)
    {
        this.setState({promoCode: newValue});
        this.fetchPromoCodeInfo();
    }

    fetchPromoCodeInfo = _.debounce(() =>
    {
        axios.get(`/promocodes`, {params: {code: this.state.promoCode}}).then((response) =>
        {
            if (response.data['promoCodes'].length > 0)
            {
                this.setState({discountApplied: response.data['promoCodes'][0].coupon.percent_off / 100.0})
            }
            else
            {
                this.setState({discountApplied: 0})
            }
        }, (error) =>
        {
            this.setState({discountApplied: 0})
        });
    }, 500)

    render() {
        const { result } = this.state;
        return (
                <LayoutWrapper>
                    <ElementsConsumer>
                        {({elements, stripe}) => (
                            <FullColumn>
                                <Row>
                                    {
                                        this.state.mode === "details" ? <TwoThirdColumn>
                                            <AppBar position="static" color="default">
                                                <Tabs
                                                    value={this.state.tab}
                                                    onChange={(changeEvent, newTab) => this.setState({tab: newTab})}
                                                    variant="scrollable"
                                                    scrollButtons="on"
                                                    indicatorColor="primary"
                                                    textColor="primary"
                                                >
                                                    {/*<Tab label="Recurring Testing" icon={<ScheduleIcon />} />*/}
                                                    <Tab label="One-Time Run" icon={<SkipNextIcon />} />
                                                </Tabs>
                                            </AppBar>
                                            {this.state.tab === 0 ?
                                                <div>
                                                    {/*<Papersheet*/}
                                                    {/*    title={``}*/}
                                                    {/*    subtitle={``}*/}
                                                    {/*>*/}
                                                    {/*    <RecurringOptions onChange={(data) => this.setState(data)} />*/}
                                                    {/*</Papersheet>*/}
                                                    {/*<br/>*/}
                                                    {/*<br/>*/}
                                                    {/*<br/>*/}
                                                    <Papersheet
                                                        // title={`Size of Testing Run`}
                                                        title={``}
                                                        subtitle={``}
                                                    >
                                                        <SizeOfRun onChange={(data) => this.setState(data)} />
                                                    </Papersheet>
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <Papersheet
                                                        title={`Credentials`}
                                                        subtitle={``}
                                                    >
                                                        <AutologinCredentials onChange={(data) => this.setState(data)} />
                                                    </Papersheet>
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <Papersheet
                                                        title={`Actions`}
                                                        subtitle={``}
                                                    >
                                                        <ActionsConfiguration onChange={(data) => this.setState(data)} />
                                                    </Papersheet>
                                                    <br/>
                                                    <br/>
                                                    <br/>
                                                    <Papersheet
                                                        title={`Path Restriction`}
                                                        subtitle={``}
                                                    >
                                                        <PathWhitelistConfiguration onChange={(data) => this.setState(data)} application={this.state.application} />
                                                    </Papersheet>
                                                    {/*<br/>*/}
                                                    {/*<br/>*/}
                                                    {/*<br/>*/}
                                                    {/*<Papersheet*/}
                                                    {/*    title={`Errors`}*/}
                                                    {/*    subtitle={``}*/}
                                                    {/*>*/}
                                                    {/*    <ErrorsConfiguration onChange={(data) => this.setState(data)} />*/}
                                                    {/*</Papersheet>*/}
                                                </div>
                                                : null
                                            }
                                            {
                                                this.state.tab === 1 ?
                                                    <div>
                                                        <Papersheet
                                                            title={`Size of Testing Run`}
                                                            subtitle={``}
                                                        >
                                                            <SizeOfRun onChange={(data) => this.setState(data)} />
                                                        </Papersheet>
                                                        <br/>
                                                        <br/>
                                                        <br/>
                                                        <Papersheet
                                                            title={`Credentials`}
                                                            subtitle={``}
                                                        >
                                                            <AutologinCredentials onChange={(data) => this.setState(data)} />
                                                        </Papersheet>
                                                        <br/>
                                                        <br/>
                                                        <br/>
                                                        <Papersheet
                                                            title={`Actions`}
                                                            subtitle={``}
                                                        >
                                                            <ActionsConfiguration onChange={(data) => this.setState(data)} />
                                                        </Papersheet>
                                                        <br/>
                                                        <br/>
                                                        <br/>
                                                        <Papersheet
                                                            title={`Path Restriction`}
                                                            subtitle={``}
                                                        >
                                                            <PathWhitelistConfiguration onChange={(data) => this.setState(data)} application={this.state.application} />
                                                        </Papersheet>
                                                        <br/>
                                                        <br/>
                                                        <br/>
                                                        <Papersheet
                                                            title={`Errors`}
                                                            subtitle={``}
                                                        >
                                                            <ErrorsConfiguration onChange={(data) => this.setState(data)} />
                                                        </Papersheet>
                                                    </div>
                                                    : null
                                            }
                                        </TwoThirdColumn> : null
                                    }

                                    {
                                        this.state.mode === "payment" ?
                                            <TwoThirdColumn>
                                                <Papersheet
                                                    title={`Payment Details`}
                                                    subtitle={``}
                                                >
                                                    <PaymentDetailsSection onChange={(data) => this.setState(data)} />
                                                </Papersheet>
                                            </TwoThirdColumn> : null
                                    }

                            <OneThirdColumn>
                                <div style={{"position":"sticky", "top":"5vh"}}>
                                    <Papersheet
                                        title={`Checkout`}
                                        subtitle={``}
                                    >
                                        <CheckoutPageWrapper className="checkoutPageWrapper" style={{"marginTop": "-20px", "marginBottom": "-20px"}}>
                                            <div className="orderInfo">
                                                <div className="orderTable">
                                                    <div className="orderTableHead">
                                                        <span className="tableHead">Item</span>
                                                        <span className="tableHead">Amount</span>
                                                    </div>

                                                    <div className="orderTableBody">
                                                        <div className="singleOrderInfo">
                                                            <p>
                                                                <span>Actions (ie. clicks) per browser session</span>
                                                            </p>
                                                            <span
                                                                className="totalPrice">{addCommas(this.state.length)}</span>
                                                        </div>
                                                        <div className="singleOrderInfo">
                                                            <p>
                                                                <span>Browser Sessions</span>
                                                            </p>
                                                            <span
                                                                className="totalPrice">* {addCommas(this.state.sessions)}</span>
                                                        </div>
                                                        <div className="singleOrderInfo">
                                                            <p>
                                                                <span>Total actions to be performed</span>
                                                            </p>
                                                            <span
                                                                className="totalPrice">= {addCommas(this.state.length * this.state.sessions)}</span>
                                                        </div>
                                                        <div className="singleOrderInfo">
                                                            <p>
                                                                <span>Cost per 1,000 actions</span>
                                                            </p>
                                                            <span
                                                                className="totalPrice">* ${1.00.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    {
                                                        this.state.discountApplied === 0 ?
                                                            <div className="orderTableFooter" style={{"marginBottom": "10px"}}>
                                                                <span>Total</span>
                                                                <span>= ${this.calculateFinalTotal().toFixed(2)} CAN / run</span>
                                                            </div> : null
                                                    }
                                                    {
                                                        this.state.discountApplied > 0 ? [
                                                            <div className="orderTableFooter" key={0} style={{"marginBottom": "0px"}}>
                                                                <span>Sub total</span>
                                                                <span>= ${this.calculatePrice().toFixed(2)} CAN / run</span>
                                                            </div>,
                                                            <div className="orderTableFooter" key={0} style={{"marginBottom": "0px"}}>
                                                                <span>Discount Applied</span>
                                                                <span>= (${(this.calculateDiscount()).toFixed(2)})</span>
                                                            </div>,
                                                            <div className="orderTableFooter" key={0} style={{"marginBottom": "10px"}}>
                                                                <span>Total</span>
                                                                <span>= ${(this.calculateFinalTotal() * (1.0 - this.state.discountApplied)).toFixed(2)} CAN / run</span>
                                                            </div>
                                                        ] : null
                                                    }

                                                    <div className="orderTableFooter" style={{"marginBottom": "10px"}}>
                                                        <span>Apply Promo Code</span>
                                                        <span>
                                                        <TextField
                                                            id={`promo-code-field`}
                                                            label={`Promo Code`}
                                                            title={"Promo Code"}
                                                            type={"text"}
                                                            value={this.state.promoCode}
                                                            onChange={(event) => this.changePromoCode(event.target.value)}
                                                            margin="normal"
                                                        />
                                                        </span>
                                                    </div>

                                                    {
                                                        this.state.mode === "details" ?
                                                            <LoaderButton disabled={!this.state.productId}
                                                                    onClick={() => this.launchTestingRunButtonClicked()}
                                                            >
                                                                Launch Testing Run
                                                            </LoaderButton> : null
                                                    }

                                                    {
                                                        this.state.mode === "payment" ?
                                                            <LoaderButton color="orange" onClick={() => this.completeOrder(elements)}>
                                                                Complete Order
                                                            </LoaderButton> : null
                                                    }
                                                </div>
                                            </div>
                                        </CheckoutPageWrapper>
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

