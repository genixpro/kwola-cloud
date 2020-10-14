import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import 'plyr/dist/plyr.css'
import TextField from "../../components/uielements/textfield";
import SingleCard from "../Shuffle/singleCard";
import Auth from "../../helpers/auth0";
import {FormControlLabel, FormGroup} from "../../components/uielements/form";
import Checkbox from "../../components/uielements/checkbox";
import _ from "underscore";
import {Button} from "../UiElements/Button/button.style";
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import RecurringTestingTriggerOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import PaymentDetailsSection from "../NewTestingRun/PaymentDetailsSection";
import "./main.scss";
import DoneIcon from '@material-ui/icons/Done';
import CloseIcon from '@material-ui/icons/Close';


class NewApplicationWizardStep4 extends Component {
    state = {
        discountApplied: 0,
        fetchingPromoCode: false
    };

    componentDidMount()
    {

    }

    changeParentApplicationField(field, newValue)
    {
        this.props.onApplicationFieldChanged(field, newValue);
    }

    changeParentRunConfigurationField(field, newValue)
    {
        this.props.onRunConfigurationFieldChanged(field, newValue);
    }

    changeRunConfiguration(newValues)
    {
        if (this.props.onChangeRunConfiguration)
        {
            this.props.onChangeRunConfiguration(newValues);
        }
    }

    nextPageClicked()
    {
        if (this.props.onNextPageClicked)
        {
            this.props.onNextPageClicked();
        }
    }

    previousPageClicked()
    {
        if (this.props.onPreviousPageClicked)
        {
            this.props.onPreviousPageClicked();
        }
    }

    changePromoCode(newCode)
    {
        this.setState({promoCode: newCode, fetchingPromoCode: true}, () => this.fetchPromoCodeInfo());
        this.changeParentApplicationField("promoCode", newCode);
    }


    fetchPromoCodeInfo = _.debounce(() =>
    {
        axios.get(`/promocodes`, {params: {code: this.props.application.promoCode}}).then((response) =>
        {
            if (response.data['promoCodes'].length > 0)
            {
                this.setState({discountApplied: response.data['promoCodes'][0].coupon.percent_off / 100.0, fetchingPromoCode: false})
            }
            else
            {
                this.setState({discountApplied: 0, fetchingPromoCode: false})
            }
        }, (error) =>
        {
            this.setState({discountApplied: 0, fetchingPromoCode: false})
        });
    }, 500)

    onPaymentDetailsChanged(newValues)
    {
        this.changeParentApplicationField("billingName", newValues.billingName)
        this.changeParentApplicationField("billingAddress", newValues.billingAddress)
        this.changeParentApplicationField("billingCard", newValues.billingCard)
        this.changeParentApplicationField("billingPaymentMethod", newValues.billingPaymentMethod)
    }

    isValid()
    {
        if (!this.props.application.billingName)
        {
            return false;
        }
        if (!this.props.application.billingAddress)
        {
            return false;
        }
        if (!this.props.application.billingCard)
        {
            return false;
        }
        if (!this.props.application.billingCard.complete)
        {
            return false;
        }
        return true;
    }

    render()
    {
        const { result } = this.state;

        return (
            <Papersheet title={`New Application - Payment Details`} subtitle={`Step 4 of 6`}>
                <PaymentDetailsSection
                    onChange={(data) => this.onPaymentDetailsChanged(data)}
                    value={this.props.application}
                    hideHelp={true}
                    hideWrapper={true}
                    showNoChargeText={this.props.application.package === "monthly"}
                />
                <div className={"promo-code-box"}>
                    <span className={"promo-code-label"}>Apply Promo Code</span>
                    <TextField
                        id={`promo-code-field`}
                        label={`Promo Code`}
                        title={"Promo Code"}
                        type={"text"}
                        value={this.props.application.promoCode}
                        onChange={(event) => this.changePromoCode(event.target.value)}
                        margin="normal"
                    />
                    { this.state.discountApplied && !this.state.fetchingPromoCode ?
                        <span className={"promo-code-discount-applied"}>
                            <DoneIcon /> {(this.state.discountApplied * 100).toFixed(0)}% discount applied
                        </span> : null
                    }
                    { this.state.discountApplied === 0 && this.props.application.promoCode && !this.state.fetchingPromoCode ?
                        <span className={"promo-code-discount-applied"}>
                            <CloseIcon /> Invalid Promo Code
                        </span> : null
                    }
                </div>
                <br/>
                <br/>

                <Row>
                    <div className={"wizard-navigation-buttons"}>
                        <Button variant="contained"
                                size="medium"
                                color={"secondary"}
                                className={"wizard-button"}
                                title={"Previous Step"}
                                onClick={(event) => this.previousPageClicked(event)}>
                            <span>
                                <NavigateBeforeIcon style={{"position": "relative", "top": "6px"}} /> Previous&nbsp;&nbsp;&nbsp;</span>
                        </Button>
                        <Button variant="contained"
                                size="medium"
                                color={"primary"}
                                className={"wizard-button"}
                                title={"Next Step"}
                                disabled={!this.isValid()}
                                onClick={(event) => this.nextPageClicked(event)}>
                            <span>&nbsp;&nbsp;&nbsp;Next <NavigateNextIcon style={{"position": "relative", "top": "6px"}} /></span>
                        </Button>
                    </div>
                </Row>
            </Papersheet>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep4} };
export default connect(mapStateToProps)(NewApplicationWizardStep4);

