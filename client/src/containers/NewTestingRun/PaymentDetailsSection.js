import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {PaymentRequestButtonElement, CardElement, useStripe, useElements, ElementsConsumer} from "@stripe/react-stripe-js";


class PaymentDetailsSection extends Component {
    state = {
        card: null,
        name: "",
        address: ""
    }

    updateParent()
    {
        this.props.onChange({
            name: this.state.name,
            address: this.state.address,
            card: this.state.card
        })
    }

    componentDidMount() {

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


    addressChanged(newValue)
    {
        this.setState({address: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <CardElement
                        onChange={(cardChangedEvent) => this.cardDetailsChanged(cardChangedEvent)}
                    />
                    {this.state.errorMessage}
                    {
                        process.env.REACT_APP_SHOW_INTERNAL_TESTING_MESSAGES === "true" ?
                            <div>
                                <br/>
                                <a href={"https://stripe.com/docs/testing"} target={"_blank"}>Please click here to get testing card numbers</a>
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
                    />
                    <br/>
                    <TextField
                        id="address"
                        label="Billing Address"
                        type={"text"}
                        value={this.state.address}
                        onChange={(event) => this.addressChanged(event.target.value)}
                        margin="normal"
                    />
                </Column>
                <Column xs={3}>
                    <p>Please provide your payment details</p>
                </Column>
            </Row>
        </div>;
    }
}


const mapStateToProps = (state) => {return { ...state.PaymentDetailsSection} };
export default connect(mapStateToProps)(PaymentDetailsSection);

