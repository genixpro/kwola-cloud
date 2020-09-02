import CheckoutPageWrapper, {RunTypes} from "./checkout.style.js";
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';

class SizeOfRun extends Component {
    state = {
        chosenPackage: 2,
        length: 100,
        sessions: 250,
        hours: 12
    }

    componentDidMount()
    {
        this.updateParent();
        this.packageChanged(2);
    }

    updateParent()
    {
        this.props.onChange({
                length: this.state.length,
                sessions: this.state.sessions,
                hours: this.state.hours
            }
        )
    }

    lengthChanged(newValue)
    {
        this.setState({length: newValue}, () => this.updateParent());
    }

    packageChanged(newPackage)
    {
        this.setState({chosenPackage: newPackage}, () => this.updateParent());

        if (newPackage === 0)
        {
            this.setState({
                hours: 4,
                length: 50,
                sessions: 50
            })
        }
        else if (newPackage === 1)
        {
            this.setState({
                hours: 6,
                length: 100,
                sessions: 100
            })
        }
        else if (newPackage === 2)
        {
            this.setState({
                hours: 9,
                length: 100,
                sessions: 400
            })
        }
        else if (newPackage === 3)
        {
            this.setState({
                hours: 12,
                length: 250,
                sessions: 500
            })
        }
        else if (newPackage === 4)
        {
            this.setState({
                hours: 12,
                length: 250,
                sessions: 1000
            })
        }
    }

    sessionsChanged(newValue)
    {
        this.setState({sessions: newValue}, () => this.updateParent());
    }

    hoursChanged(newValue)
    {
        this.setState({hours: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={12} md={12} lg={12}>
                    <p>Size of testing run</p>
                    <RunTypes>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 0 ? "primary" : "default"} onClick={() => this.packageChanged(0)}>
                            Extra Quick
                        </Button>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 1 ? "primary" : "default"} onClick={() => this.packageChanged(1)}>
                            Quick
                        </Button>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 2 ? "primary" : "default"} onClick={() => this.packageChanged(2)}>
                            Medium
                        </Button>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 3 ? "primary" : "default"} onClick={() => this.packageChanged(3)}>
                            Thorough
                        </Button>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 4 ? "primary" : "default"} onClick={() => this.packageChanged(4)}>
                            Extra Thorough
                        </Button>
                        <Button size="medium" variant="extended" color={this.state.chosenPackage === 5 ? "primary" : "default"} onClick={() => this.packageChanged(5)}>
                            Custom
                        </Button>
                    </RunTypes>
                </Column>
            </Row>
            {
                this.state.chosenPackage === 5 ?
                    <Row>
                        <Column xs={12} md={9} lg={9}>
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="length"
                                    label="# of actions per browser"
                                    type={"number"}
                                    min={10}
                                    value={this.state.length}
                                    onChange={(event) => this.lengthChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div>
                        </Column>
                        <Column xs={12} md={3} lg={3}>
                            <p>The number of actions performed on your web application for each web-browser (e.g. clicks, typing something, etc..)</p>
                        </Column>
                    </Row>: null
            }
            {
                this.state.chosenPackage === 5 ?
                    <Row>
                        <Column xs={12} md={9} lg={9}>
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="sessions"
                                    label="# of web browsers"
                                    type={"number"}
                                    min={1}
                                    max={10000000}
                                    value={this.state.sessions}
                                    onChange={(event) => this.sessionsChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div>
                        </Column>
                        <Column xs={12} md={3} lg={3}>
                            <p>The total number of web browsers that will be opened on your web application.</p>
                        </Column>
                    </Row>: null
            }
        </div>;
    }
}

const mapStateToProps = (state) => {return { ...state.SizeOfRun} };
export default connect(mapStateToProps)(SizeOfRun);

