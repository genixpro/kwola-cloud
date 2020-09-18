import CheckoutPageWrapper, {RunTypes} from "./checkout.style.js";
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import axios from "axios";
import _ from "underscore";
import {connect, Provider} from 'react-redux';
import LoaderButton from "../../components/LoaderButton";




function addCommas(value)
{
    const regex = /(\d+)(\d\d\d)/g;
    while(regex.test(value))
    {
        value = value.toString().replace(regex, "$1,$2");
    }
    return value
}




class CheckoutPriceWidget extends Component {
    state = {
        promoCode: "",
        discountApplied: 0
    };

    constructor()
    {
        super();

        // window.ga('event', 'optimize.callback', {
        //     name: 'qvH9plMMQYqYS5d_13VXcA',
        //     callback: (value) => this.setState({variant: value})
        // });
    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        this.props.onChange({
            promoCode: this.state.promoCode
        })
    }


    componentDidMount()
    {
        // Temporary: Prefill the promocode field
        setTimeout(() => this.changePromoCode("BETATRIAL"), 1500);

        if (this.props.objRef)
        {
            this.props.objRef(this);
        }
    }


    calculatePrice()
    {
        return Math.max(1.00, Number((this.props.runConfiguration.testingSequenceLength * this.props.runConfiguration.totalTestingSessions * 0.001).toFixed(2)));
    }


    calculateDiscount()
    {
        return this.calculatePrice() * this.state.discountApplied;
    }

    calculateFinalTotal()
    {
        return this.calculatePrice() * (1.0 - this.state.discountApplied);
    }


    changePromoCode(newValue)
    {
        this.setState({promoCode: newValue}, () => this.fetchPromoCodeInfo());
    }


    fetchPromoCodeInfo = _.debounce(() =>
    {
        axios.get(`/promocodes`, {params: {code: this.state.promoCode}}).then((response) =>
        {
            if (response.data['promoCodes'].length > 0)
            {
                this.setState({discountApplied: response.data['promoCodes'][0].coupon.percent_off / 100.0}, () => this.updateParent())
            }
            else
            {
                this.setState({discountApplied: 0}, () => this.updateParent())
            }
        }, (error) =>
        {
            this.setState({discountApplied: 0}, () => this.updateParent())
        });
    }, 500)


    checkoutButtonClicked()
    {
        if (this.props.onCheckoutButtonClicked)
        {
            this.props.onCheckoutButtonClicked();
        }
    }


    render()
    {
        const { result } = this.state;

        return (
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
                                        className="totalPrice">{addCommas(this.props.runConfiguration.testingSequenceLength)}</span>
                                </div>
                                <div className="singleOrderInfo">
                                    <p>
                                        <span>Browser Sessions</span>
                                    </p>
                                    <span
                                        className="totalPrice">* {addCommas(this.props.runConfiguration.totalTestingSessions)}</span>
                                </div>
                                <div className="singleOrderInfo">
                                    <p>
                                        <span>Total actions to be performed</span>
                                    </p>
                                    <span
                                        className="totalPrice">= {addCommas(this.props.runConfiguration.testingSequenceLength * this.props.runConfiguration.totalTestingSessions)}</span>
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

                            <LoaderButton onClick={() => this.checkoutButtonClicked()}>
                                {this.props.checkoutButtonText}
                            </LoaderButton>
                        </div>
                    </div>
                </CheckoutPageWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.CheckoutWidget} };
export default connect(mapStateToProps)(CheckoutPriceWidget);

