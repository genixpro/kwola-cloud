import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {PaymentRequestButtonElement, CardElement, useStripe, useElements, ElementsConsumer} from "@stripe/react-stripe-js";
import Papersheet from "../../components/utility/papersheet";
import stripePromise from "../../stripe";
import Promise from "bluebird";
import {getData} from "country-list";
import axios from "axios";


class PaymentDetailsSection extends Component {
    state = {
        card: null,
        name: "",
        address: "",
        city: "",
        country: ""
    }

    updateParent() {
        if (!this.props.onChange) {
            return null;
        }

        if (this.state.card && this.state.card.complete) {
            stripePromise.then((stripe) => {
                const cardElement = this.elements.getElement(CardElement);

                return stripe.createPaymentMethod({
                    type: "card",
                    card: cardElement,
                    billing_details: {
                        name: this.state.name,
                        address: {
                            city: this.state.city,
                            country: this.state.country,
                            line1: this.state.address
                        }
                    }
                }).then((result) => {
                    if (result.error) {
                        return Promise.rejected(result.error);
                    } else {
                        this.props.onChange({
                            billingName: this.state.name,
                            billingCity: this.state.city,
                            billingCountry: this.state.country,
                            billingAddress: this.state.address,
                            billingCard: this.state.card,
                            billingPaymentMethod: result.paymentMethod.id
                        });
                        return Promise.fulfilled();
                    }
                });
            })
        }
        else
        {
            this.props.onChange({
                billingName: this.state.name,
                billingCity: this.state.city,
                billingCountry: this.state.country,
                billingAddress: this.state.address,
                billingCard: this.state.card,
                billingPaymentMethod: null
            });
            return Promise.fulfilled();
        }
    }




    componentDidMount()
    {
        if (this.props.value)
        {
            this.setState({
                name: this.props.value.billingName,
                city: this.props.value.billingCity,
                country: this.props.value.billingCountry,
                address: this.props.value.billingAddress,
                card: null
            }, () => this.updateParent());
        }
    }


    cardDetailsChanged(cardChangedEvent)
    {
        const stateUpdate = {
            card: cardChangedEvent
        };

        if (cardChangedEvent.error)
        {
            stateUpdate.errorMessage = cardChangedEvent.error.message;
        }
        else
        {
            stateUpdate.errorMessage = '';
        }

        this.setState(stateUpdate, () => this.updateParent());
    }

    nameChanged(newValue)
    {
        this.setState({name: newValue}, () => this.updateParent());
    }


    cityChanged(newValue)
    {
        this.setState({city: newValue}, () => this.updateParent());
    }


    countryChanged(newValue)
    {
        this.setState({country: newValue}, () => this.updateParent());
    }


    addressChanged(newValue)
    {
        this.setState({address: newValue}, () => this.updateParent());
    }

    render()
    {
        const body =
            <ElementsConsumer>
                {({elements, stripe}) => {
                    this.elements = elements;
                    return <Row>
                        <Column xs={9}>
                            <div style={{
                                "width": "calc(min(100%, 600px))",
                                "borderBottom": "1px solid grey",
                                "paddingBottom": "15px"
                            }}>
                                <CardElement
                                    onChange={(cardChangedEvent) => this.cardDetailsChanged(cardChangedEvent)}
                                />
                            </div>
                            {this.state.errorMessage}
                            {
                                this.props.showNoChargeText ?
                                    <div>
                                        <span style={{"fontSize": "12px", "color": "#333", "fontStyle": "italic"}}>Your credit card will not be charged until after your free first month. Cancel anytime without being charged.</span>
                                        <br/>
                                    </div> : null
                            }
                            {
                                process.env.REACT_APP_SHOW_INTERNAL_TESTING_MESSAGES === "true" ?
                                    <div>
                                        <br/>
                                        <a href={"https://stripe.com/docs/testing"} target={"_blank"}
                                           style={{"fontSize": "12px", "color": "#333"}}>DEBUG: Click here to get
                                            testing card numbers</a>
                                        <br/>
                                    </div> : null
                            }
                            <br/>
                            <TextField
                                id="name"
                                label="Name"
                                type={"text"}
                                value={this.state.name}
                                onChange={(event) => this.nameChanged(event.target.value)}
                                margin="normal"
                                style={{"width": "calc(min(100%, 800px))"}}
                            />
                            <br/>
                            <TextField
                                id="address"
                                label="Billing City"
                                type={"text"}
                                value={this.state.city}
                                onChange={(event) => this.cityChanged(event.target.value)}
                                margin="normal"
                                style={{"width": "calc(min(100%, 800px))"}}
                            />
                            <br/>
                            <TextField
                                id="address"
                                label="Billing Country"
                                select
                                value={this.state.country}
                                onChange={(event) => this.countryChanged(event.target.value)}
                                margin="normal"
                                style={{"width": "calc(min(100%, 800px))"}}
                                SelectProps={{
                                    native: true,
                                    MenuProps: {
                                        className: 'menu',
                                    },
                                }}
                            >
                                {
                                    getData().map((countryInfo) =>
                                    {
                                        return <option value={countryInfo.code}>{countryInfo.name}</option>
                                    })
                                }

                            </TextField>
                            <br/>
                            <TextField
                                id="address"
                                label="Billing Street Address"
                                type={"text"}
                                value={this.state.address}
                                onChange={(event) => this.addressChanged(event.target.value)}
                                margin="normal"
                                style={{"width": "calc(min(100%, 800px))"}}
                            />
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>Please provide your payment details</p>
                                </Column> : null
                        }
                    </Row>
                }
            }
        </ElementsConsumer>;

        if (this.props.hideWrapper)
        {
            return body;
        }
        else
        {
            return <Papersheet
                title={`Payment Details`}
                subtitle={``}
            >
                {body}
            </Papersheet>;
        }
    }
}


const mapStateToProps = (state) => {return { ...state.PaymentDetailsSection} };
export default connect(mapStateToProps)(PaymentDetailsSection);

