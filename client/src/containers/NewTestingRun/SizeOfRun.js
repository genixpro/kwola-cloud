import CheckoutPageWrapper, {RunTypes} from "./checkout.style.js";
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import Papersheet from "../../components/utility/papersheet";

class SizeOfRun extends Component {
    state = {
        chosenPackage: null,
        length: 100,
        sessions: 250,
        hours: 12
    }

    static packages = [
        {
            name: "Extra Quick",
            hours: 4,
            length: 50,
            sessions: 50
        },
        {
            name: "Quick",
            hours: 6,
            length: 100,
            sessions: 100
        },
        {
            name: "Medium",
            hours: 9,
            length: 100,
            sessions: 400
        },
        {
            name: "Thorough",
            hours: 12,
            length: 250,
            sessions: 500
        },
        {
            name: "Extra Thorough",
            hours: 12,
            length: 250,
            sessions: 1000
        }
    ]

    static findMatchingPackageIndex(length, sessions, hours)
    {
        let index = 0;
        for (let pack of SizeOfRun.packages)
        {
            if (pack.length === length && pack.hours === hours && pack.sessions === sessions)
            {
                return index;
            }
            index += 1;
        }
        return null;
    }

    componentDidMount()
    {
        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            const packageIndex = SizeOfRun.findMatchingPackageIndex(config.testingSequenceLength, config.totalTestingSessions, config.hours);
            const stateData = {
                length: config.testingSequenceLength,
                sessions: config.totalTestingSessions,
                hours: config.hours
            };

            if (packageIndex === null)
            {
                stateData.chosenPackage = SizeOfRun.packages.length;
            }
            else
            {
                stateData.chosenPackage = packageIndex;
            }

            this.setState(stateData);
        }
        else
        {
            this.packageChanged(2);
        }

        this.updateParent();
    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        this.props.onChange({
                testingSequenceLength: this.state.length,
                totalTestingSessions: this.state.sessions,
                hours: this.state.hours
            }
        )
    }

    lengthChanged(newValue)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({length: newValue}, () => this.updateParent());
    }

    packageChanged(newPackageIndex)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        if (newPackageIndex < SizeOfRun.packages.length)
        {
            this.setState({
                chosenPackage: newPackageIndex,
                ...SizeOfRun.packages[newPackageIndex]
            }, () => this.updateParent())
        }
        else
        {
            this.setState({chosenPackage: newPackageIndex}, () => this.updateParent())
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
        return<Papersheet
                title={`Size`}
                subtitle={``}
            >
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    {/*<p>Size of testing run</p>*/}
                    <RunTypes>
                        <Button size="medium"
                                variant="extended"
                                color={this.state.chosenPackage === 0 ? "primary" : "default"}
                                style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                onClick={() => this.packageChanged(0)}>
                            Extra Quick
                        </Button>
                        <Button
                            size="medium"
                            variant="extended"
                            color={this.state.chosenPackage === 1 ? "primary" : "default"}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            onClick={() => this.packageChanged(1)}>
                            Quick
                        </Button>
                        <Button
                            size="medium"
                            variant="extended"
                            color={this.state.chosenPackage === 2 ? "primary" : "default"}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            onClick={() => this.packageChanged(2)}>
                            Medium
                        </Button>
                        <Button
                            size="medium"
                            variant="extended"
                            color={this.state.chosenPackage === 3 ? "primary" : "default"}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            onClick={() => this.packageChanged(3)}>
                            Thorough
                        </Button>
                        <Button
                            size="medium"
                            variant="extended"
                            color={this.state.chosenPackage === 4 ? "primary" : "default"}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            onClick={() => this.packageChanged(4)}>
                            Extra Thorough
                        </Button>
                        <Button
                            size="medium"
                            variant="extended"
                            color={this.state.chosenPackage === 5 ? "primary" : "default"}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            onClick={() => this.packageChanged(5)}>
                            Custom
                        </Button>
                    </RunTypes>
                </Column>
            </Row>
            {
                this.state.chosenPackage === 5 ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="length"
                                    label="# of actions per browser"
                                    type={"number"}
                                    min={10}
                                    value={this.state.length}
                                    disabled={this.props.disabled}
                                    onChange={(event) => this.lengthChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div>
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>The number of actions performed on your web application for each web-browser (e.g. clicks, typing something, etc..)</p>
                                </Column> : null
                        }
                    </Row>: null
            }
            {
                this.state.chosenPackage === 5 ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="sessions"
                                    label="# of web browsers"
                                    type={"number"}
                                    min={1}
                                    max={10000000}
                                    value={this.state.sessions}
                                    disabled={this.props.disabled}
                                    onChange={(event) => this.sessionsChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div>
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>The total number of web browsers that will be opened on your web application.</p>
                                </Column> : null
                        }
                    </Row>: null
            }
        </Papersheet>;
    }
}

const mapStateToProps = (state) => {return { ...state.SizeOfRun} };
export default connect(mapStateToProps)(SizeOfRun);

