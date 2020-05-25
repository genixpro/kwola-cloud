import AddIcon from '@material-ui/icons/Add';
import AlarmIcon from '@material-ui/icons/Alarm';
import AppBar from '../../components/uielements/appbar';
import Checkbox from '../../components/uielements/checkbox';
import CheckoutPageWrapper from "./checkout.style.js";
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
import TextFieldMargins from "../UiElements/TextFields/layout";
import axios from "axios";
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import {connect, Provider} from 'react-redux';
import Auth0 from '../../helpers/auth0';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import {PaymentRequestButtonElement, CardElement, useStripe, useElements, ElementsConsumer} from "@stripe/react-stripe-js";
import stripePromise from "../../stripe";
import mixpanel from 'mixpanel-browser';

function addCommas(value)
{
    const regex = /(\d+)(\d\d\d)/g;
    while(regex.test(value))
    {
        value = value.toString().replace(regex, "$1,$2");
    }
    return value
}

class RecurringOptions extends Component {

    state = {
        tab: 0,
        repeatFrequency: 1,
        repeatUnit: "hours",
        hoursEnabled: {
            0: false,
            1: false,
            2: false,
            3: true,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false,
            11: false,
            12: false
        },
        daysOfWeekEnabled: {
            "Sun": false,
            "Mon": false,
            "Tue": false,
            "Wed": false,
            "Thu": false,
            "Fri": false,
            "Sat": false
        },
        daysOfMonthEnabled: {
            0: {
                "Sun": false,
                "Mon": false,
                "Tue": false,
                "Wed": false,
                "Thu": false,
                "Fri": false,
                "Sat": false
            },
            1: {
                "Sun": false,
                "Mon": false,
                "Tue": false,
                "Wed": false,
                "Thu": false,
                "Fri": false,
                "Sat": false
            },
            2: {
                "Sun": false,
                "Mon": false,
                "Tue": false,
                "Wed": true,
                "Thu": false,
                "Fri": false,
                "Sat": false
            },
            3: {
                "Sun": false,
                "Mon": false,
                "Tue": false,
                "Wed": false,
                "Thu": false,
                "Fri": false,
                "Sat": false
            },
            4: {
                "Sun": false,
                "Mon": false,
                "Tue": false,
                "Wed": false,
                "Thu": false,
                "Fri": false,
                "Sat": false
            }
        },
        repositoryURL: "",
        repositoryUsername: "",
        repositoryPassword: "",
        repositorySSHPrivateKey: ""
    }

    componentDidMount() {
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 0)
        {
            this.toggleDaysOfWeekEnabled("Sun");
        }
        else if (dayOfWeek === 1)
        {
            this.toggleDaysOfWeekEnabled("Mon");
        }
        else if (dayOfWeek === 2)
        {
            this.toggleDaysOfWeekEnabled("Tue");
        }
        else if (dayOfWeek === 3)
        {
            this.toggleDaysOfWeekEnabled("Wed");
        }
        else if (dayOfWeek === 4)
        {
            this.toggleDaysOfWeekEnabled("Thu");
        }
        else if (dayOfWeek === 5)
        {
            this.toggleDaysOfWeekEnabled("Fri");
        }
        else if (dayOfWeek === 6)
        {
            this.toggleDaysOfWeekEnabled("Sat");
        }
    }

    updateParent()
    {
        this.props.onChange({
            repeatType: this.state.tab,
            repeatFrequency: this.state.repeatFrequency,
            repeatUnit: this.state.repeatUnit,
            hoursEnabled: this.state.hoursEnabled,
            daysOfWeekEnabled: this.state.daysOfWeekEnabled,
            daysOfMonthEnabled: this.state.daysOfMonthEnabled,
            repositoryURL: this.state.repositoryURL,
            repositoryUsername: this.state.repositoryUsername,
            repositoryPassword: this.state.repositoryPassword,
            repositorySSHPrivateKey: this.state.repositorySSHPrivateKey
            }
        )
    }

    tabChanged(newTab)
    {
        this.setState({tab: newTab}, () => this.updateParent());
    }

    repeatUnitChanged(newRepeatUnit)
    {
        this.setState({repeatUnit: newRepeatUnit}, () => this.updateParent());
    }

    toggleHoursEnabled(hour)
    {
        const hoursEnabled = this.state.hoursEnabled;
        hoursEnabled[hour] = !hoursEnabled[hour];
        this.setState({hoursEnabled: hoursEnabled}, () => this.updateParent())
    }

    toggleDaysOfWeekEnabled(day)
    {
        const daysOfWeekEnabled = this.state.daysOfWeekEnabled;
        daysOfWeekEnabled[day] = !daysOfWeekEnabled[day];
        this.setState({daysOfWeekEnabled: daysOfWeekEnabled}, () => this.updateParent())
    }


    toggleDaysOfMonthEnabled(week, day)
    {
        const daysOfMonthEnabled = this.state.daysOfMonthEnabled;
        daysOfMonthEnabled[week][day] = !daysOfMonthEnabled[week][day];
        this.setState({daysOfMonthEnabled: daysOfMonthEnabled}, () => this.updateParent())
    }


    changeRepositoryField(field, newValue)
    {
        this.setState({[field]: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <Button variant="extended" color={this.state.tab === 0 ? "primary" : "default"} onClick={() => this.tabChanged(0)}>
                        Scheduled
                        <AlarmIcon className="rightIcon"></AlarmIcon>
                    </Button>
                    <Button variant="extended" color={this.state.tab === 1 ? "primary" : "default"} onClick={() => this.tabChanged(1)}>
                        Repository Commit
                        <CodeIcon className="rightIcon"></CodeIcon>
                    </Button>
                    <Button variant="extended" color={this.state.tab === 2 ? "primary" : "default"} onClick={() => this.tabChanged(2)}>
                        Webhook
                        <CloudUploadIcon className="rightIcon"></CloudUploadIcon>
                    </Button>
                </Column>
                <OneFourthColumn>
                    <p>Select the trigger for your testing runs.</p>
                </OneFourthColumn>
            </Row>
            <Row>
                <Column xs={9}>
                    <div>
                        {
                            this.state.tab === 0 ?
                                <div>
                                    <div style={{"display":"flex", "flexDirection":"row", "alignItems":"flex-start"}}>
                                        <div style={{"flexBasis": "100px", "marginTop": "3px", "flexGrow": "0"}}>Repeat every</div>

                                        <div style={{"paddingLeft": "10px"}}>
                                            <TextField
                                                type="number"
                                                value={this.state.repeatFrequency}
                                                min={1}
                                                max={100}
                                                onChange={(event, newValue) => this.setState({repeatFrequency: newValue}, () => this.updateParent())}
                                            />
                                        </div>
                                        <div style={{"paddingLeft": "10px"}}>
                                            <TextField
                                                id="select-currency-native"
                                                select
                                                value={this.state.currency}
                                                onChange={(event) => this.repeatUnitChanged(event.target.value)}
                                                SelectProps={{
                                                    native: true,
                                                    MenuProps: {
                                                        className: 'menu',
                                                    },
                                                }}
                                            >
                                            <option value={"hours"}>
                                                hours
                                            </option>
                                            <option value={"days"}>
                                                days
                                            </option>
                                            <option value={"weeks"}>
                                                weeks
                                            </option>
                                            <option value={"months"}>
                                                months
                                            </option>
                                        </TextField>
                                        </div>
                                    </div>
                                    <br/>
                                    <br/>
                                    <div style={{"display":"flex", "flexDirection":"row", "alignItems":"flex-start"}}>
                                        {
                                            this.state.repeatUnit !== "hours" ?
                                                <div style={{"flexBasis": "100px", "marginTop": "20px", "flexGrow":"0"}}>Run at</div>
                                                : null
                                        }
                                        {
                                            this.state.repeatUnit === "days" || this.state.repeatUnit === "weeks" || this.state.repeatUnit === "months" ?
                                                <div style={{"flexGrow": "1"}}>
                                                    {
                                                        [0,1,2,3,4,5].map((hour) =>
                                                            <Button variant="extended" color={this.state.hoursEnabled[hour] ? "primary" : "default"} onClick={() => this.toggleHoursEnabled(hour)}>
                                                                {hour === 0 ? 12 : hour} am
                                                            </Button>
                                                        )
                                                    }
                                                    <br/>
                                                    {
                                                        [6,7,8,9,10,11].map((hour) =>
                                                            <Button variant="extended" color={this.state.hoursEnabled[hour] ? "primary" : "default"} onClick={() => this.toggleHoursEnabled(hour)}>
                                                                {hour === 0 ? 12 : hour} am
                                                            </Button>
                                                        )
                                                    }
                                                    <br/>
                                                    {
                                                        [12,13,14,15,16,17].map((hour) =>
                                                            <Button variant="extended" color={this.state.hoursEnabled[hour] ? "primary" : "default"} onClick={() => this.toggleHoursEnabled(hour)}>
                                                                {hour === 12 ? 12 : (hour - 12)} pm
                                                            </Button>
                                                        )
                                                    }
                                                    <br/>
                                                    {
                                                        [18,19,20,21,22,23].map((hour) =>
                                                            <Button variant="extended" color={this.state.hoursEnabled[hour] ? "primary" : "default"} onClick={() => this.toggleHoursEnabled(hour)}>
                                                                {hour === 12 ? 12 : (hour - 12)} pm
                                                            </Button>
                                                        )
                                                    }
                                                </div>
                                                : null
                                        }

                                    </div>
                                    <br/>
                                    <br/>
                                    {
                                        this.state.repeatUnit === "weeks" ?
                                            <div style={{
                                                "display": "flex",
                                                "flexDirection": "row",
                                                "alignItems": "flex-start"
                                            }}>
                                                <div style={{"flexBasis": "100px", "marginTop": "20px", "flexGrow":"0"}}>Repeat on</div>

                                                {
                                                    this.state.repeatUnit === "days" || this.state.repeatUnit === "weeks" ?
                                                        <div style={{"flexGrow": "1"}}>
                                                            {
                                                                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayOfWeek) =>
                                                                    <Button variant="extended"
                                                                            color={this.state.daysOfWeekEnabled[dayOfWeek] ? "primary" : "default"}
                                                                            onClick={() => this.toggleDaysOfWeekEnabled(dayOfWeek)}>
                                                                        {dayOfWeek}
                                                                    </Button>
                                                                )
                                                            }
                                                        </div>
                                                        : null
                                                }
                                            </div>
                                            : null
                                    }
                                    {
                                        this.state.repeatUnit === "months" ?
                                            <div style={{
                                                "display": "flex",
                                                "flexDirection": "column",
                                                "alignItems": "flex-start"
                                            }}>
                                                {
                                                    [0,1,2,3,4].map((weekOfMonth) =>
                                                        <div style={{
                                                            "display": "flex",
                                                            "flexDirection": "row",
                                                            "alignItems": "flex-start",
                                                            "width": "100%"
                                                        }}>
                                                            <div style={{"flexBasis": "100px", "marginTop": "20px", "flexGrow":"0"}}>{weekOfMonth === 0 ? <span>Repeat on</span> : null}</div>
                                                            {
                                                                <div style={{"flexGrow": "1"}}>
                                                                    <span>Week {weekOfMonth + 1}</span>
                                                                    {
                                                                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayOfWeek) =>
                                                                            <Button variant="extended"
                                                                                    color={this.state.daysOfMonthEnabled[weekOfMonth][dayOfWeek] ? "primary" : "default"}
                                                                                    onClick={() => this.toggleDaysOfMonthEnabled(weekOfMonth, dayOfWeek)}>
                                                                                {dayOfWeek}
                                                                            </Button>
                                                                        )
                                                                    }
                                                                </div>
                                                            }
                                                        </div>
                                                    )
                                                }
                                            </div>
                                            : null
                                    }
                                </div>: null
                        }

                        {
                            this.state.tab === 1 ?
                                <div>
                                    <TextField
                                        id="repositoryURL"
                                        label="Git Repository URL"
                                        value={this.state.repositoryURL}
                                        onChange={(event) => this.changeRepositoryField(event.target.value)}
                                        margin="normal"
                                    />
                                    <br/>
                                    <br/>
                                    <TextField
                                        id="repositoryUsername"
                                        label="Username"
                                        value={this.state.repositoryUsername}
                                        onChange={(event) => this.changeRepositoryField(event.target.value)}
                                        margin="normal"
                                    />
                                    <br/>
                                    <TextField
                                        id="repositoryPassword"
                                        label="Password"
                                        value={this.state.repositoryPassword}
                                        onChange={(event) => this.changeRepositoryField(event.target.value)}
                                        margin="normal"
                                    />
                                    <br/>
                                    <br/>
                                    or
                                    <br />
                                    <TextField
                                        id="repositorySSHPrivateKey"
                                        label="SSH Private Key"
                                        value={this.state.repositorySSHPrivateKey}
                                        onChange={(event) => this.changeRepositoryField(event.target.value)}
                                        margin="normal"
                                    />
                                </div>: null
                        }
                    </div>
                </Column>
                <OneFourthColumn>
                    <p>These options will change how frequently Kwola runs.
                        Please note that running Kwola more frequently
                        will result in greater charges.</p>
                </OneFourthColumn>
            </Row>
        </div>;
    }
}


class SizeOfRun extends Component {
    state = {
        lengthTab: 0,
        length: 100,
        sessionsTab: 0,
        sessions: 250,
        hoursTab: 0,
        hours: 12
    }

    componentDidMount() {
        this.updateParent();
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

    lengthTabChanged(newTab)
    {
        if (newTab === 0)
        {
            this.setState({lengthTab: 0, length: 100}, () => this.updateParent());
        }
        else if (newTab === 1)
        {
            this.setState({lengthTab: 1, length: 250}, () => this.updateParent());
        }
        else if (newTab === 2)
        {
            this.setState({lengthTab: 2, length: 1000}, () => this.updateParent());
        }
        else if (newTab === 3)
        {
            this.setState({lengthTab: 3}, () => this.updateParent());
        }
    }

    lengthChanged(newValue)
    {
        this.setState({length: newValue}, () => this.updateParent());
    }

    sessionsTabChanged(newTab)
    {
        if (newTab === 0)
        {
            this.setState({sessionsTab: 0, sessions: 250}, () => this.updateParent());
        }
        else if (newTab === 1)
        {
            this.setState({sessionsTab: 1, sessions: 1000}, () => this.updateParent());
        }
        else if (newTab === 2)
        {
            this.setState({sessionsTab: 2, sessions: 5000}, () => this.updateParent());
        }
        else if (newTab === 3)
        {
            this.setState({sessionsTab: 3}, () => this.updateParent());
        }
    }

    sessionsChanged(newValue)
    {
        this.setState({sessions: newValue}, () => this.updateParent());
    }

    hoursTabChanged(newTab)
    {
        if (newTab === 0)
        {
            this.setState({hoursTab: 0, hours: 1}, () => this.updateParent());
        }
        else if (newTab === 1)
        {
            this.setState({hoursTab: 1, hours: 6}, () => this.updateParent());
        }
        else if (newTab === 2)
        {
            this.setState({hoursTab: 2, hours: 24}, () => this.updateParent());
        }
        else if (newTab === 3)
        {
            this.setState({hoursTab: 3}, () => this.updateParent());
        }
    }

    hoursChanged(newValue)
    {
        this.setState({hours: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={12} md={12} lg={9}>
                    <p>Number of actions per session</p>
                    <Button variant="extended" color={this.state.lengthTab === 0 ? "primary" : "default"} onClick={() => this.lengthTabChanged(0)}>
                        Short (100)
                    </Button>
                    <Button variant="extended" color={this.state.lengthTab === 1 ? "primary" : "default"} onClick={() => this.lengthTabChanged(1)}>
                        Medium (250)
                    </Button>
                    <Button variant="extended" color={this.state.lengthTab === 2 ? "primary" : "default"} onClick={() => this.lengthTabChanged(2)}>
                        Long (1,000)
                    </Button>
                    <Button variant="extended" color={this.state.lengthTab === 3 ? "primary" : "default"} onClick={() => this.lengthTabChanged(3)}>
                        Custom
                    </Button>
                    <br/>
                    {
                        this.state.lengthTab === 3 ?
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="length"
                                    label="# of actions"
                                    type={"number"}
                                    min={10}
                                    value={this.state.length}
                                    onChange={(event) => this.lengthChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div> : null
                    }
                </Column>
                <Column xs={12} md={12} lg={3}>
                    <p>Select how many actions you want each browser session to perform on your web application. This impacts how deep in your application Kwola will go when looking for bugs.</p>
                </Column>
            </Row>
            <Row>
                <Column xs={12} md={12} lg={9}>
                    <p>Number of sessions</p>
                    <Button variant="extended" color={this.state.sessionsTab === 0 ? "primary" : "default"} onClick={() => this.sessionsTabChanged(0)}>
                        Small (250)
                    </Button>
                    <Button variant="extended" color={this.state.sessionsTab === 1 ? "primary" : "default"} onClick={() => this.sessionsTabChanged(1)}>
                        Medium (1,000)
                    </Button>
                    <Button variant="extended" color={this.state.sessionsTab === 2 ? "primary" : "default"} onClick={() => this.sessionsTabChanged(2)}>
                        Large (5,000)
                    </Button>
                    <Button variant="extended" color={this.state.sessionsTab === 3 ? "primary" : "default"} onClick={() => this.sessionsTabChanged(3)}>
                        Custom
                    </Button>
                    <br/>
                    {
                        this.state.sessionsTab === 3 ?
                            <div style={{"paddingLeft":"20px"}}>
                                <TextField
                                    id="sessions"
                                    label="# of sessions"
                                    type={"number"}
                                    min={1}
                                    max={10000000}
                                    value={this.state.sessions}
                                    onChange={(event) => this.sessionsChanged(event.target.value)}
                                    margin="normal"
                                />
                            </div> : null
                    }
                </Column>
                <Column xs={12}  md={12} lg={3}>
                    <p>How many total browser sessions do you want run on your application? This impacts how thorough Kwola will be in triggering all edge-case behaviours of your application.</p>
                </Column>
            </Row>

            {/*<Row>*/}
            {/*    <Column xs={9}>*/}
            {/*        <p>Pace of Run</p>*/}
            {/*        <Button variant="extended" color={this.state.hoursTab === 0 ? "primary" : "default"} onClick={() => this.hoursTabChanged(0)}>*/}
            {/*            Fast (1 hour)*/}
            {/*        </Button>*/}
            {/*        <Button variant="extended" color={this.state.hoursTab === 1 ? "primary" : "default"} onClick={() => this.hoursTabChanged(1)}>*/}
            {/*            Medium (6 hours)*/}
            {/*        </Button>*/}
            {/*        <Button variant="extended" color={this.state.hoursTab === 2 ? "primary" : "default"} onClick={() => this.hoursTabChanged(2)}>*/}
            {/*            Slow (1 day)*/}
            {/*        </Button>*/}
            {/*        <Button variant="extended" color={this.state.hoursTab === 3 ? "primary" : "default"} onClick={() => this.hoursTabChanged(3)}>*/}
            {/*            Custom*/}
            {/*        </Button>*/}
            {/*        <br/>*/}
            {/*        {*/}
            {/*            this.state.hoursTab === 3 ?*/}
            {/*                <div style={{"paddingLeft":"20px"}}>*/}
            {/*                    <TextField*/}
            {/*                        id="hours"*/}
            {/*                        label="# of hours to extend the session over"*/}
            {/*                        type={"number"}*/}
            {/*                        min={1}*/}
            {/*                        max={1000}*/}
            {/*                        value={this.state.hours}*/}
            {/*                        onChange={(event) => this.hoursChanged(event.target.value)}*/}
            {/*                        margin="normal"*/}
            {/*                    />*/}
            {/*                </div> : null*/}
            {/*        }*/}
            {/*    </Column>*/}
            {/*    <Column xs={3}>*/}
            {/*        <p>How quickly do you want this run to go? This impacts load on your web application. Extending it also allows Kwola AI to do more learning.</p>*/}
            {/*    </Column>*/}
            {/*</Row>*/}

        </div>;
    }
}


class AutologinCredentials extends Component {
    state = {
        autologin: true,
        email: "",
        password: ""
    }

    updateParent()
    {
        this.props.onChange({
            autologin: this.state.autologin,
            email: this.state.email,
            password: this.state.password
        })
    }

    componentDidMount() {

    }

    toggleEnableAutologin()
    {
        this.setState({autologin: !this.state.autologin}, () => this.updateParent());
    }


    emailChanged(newValue)
    {
        this.setState({email: newValue}, () => this.updateParent());
    }


    passwordChanged(newValue)
    {
        this.setState({password: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={12}  md={12} lg={9}>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.autologin}
                                    onChange={() => this.toggleEnableAutologin()}
                                    value="autologin"
                                />
                            }
                            label="Enable Heuristic Auto Login?"
                        />
                    </FormGroup>
                    <br/>
                    {
                        this.state.autologin ?
                            <TextField
                                id="email"
                                label="Email / Username"
                                type={"text"}
                                value={this.state.email}
                                onChange={(event) => this.emailChanged(event.target.value)}
                                margin="normal"
                            /> : null
                    }
                    <br/>
                    {
                        this.state.autologin ?
                            <TextField
                                id="password"
                                label="Password"
                                type={"text"}
                                value={this.state.password}
                                onChange={(event) => this.passwordChanged(event.target.value)}
                                margin="normal"
                            /> : null
                    }
                </Column>
                <Column xs={12}  md={12} lg={3}>
                    <p>Select whether you want Kwola to attempt an automatic login as soon as it lands on your application URL.</p>
                </Column>
            </Row>
        </div>;
    }
}


class ActionsConfiguration extends Component {
    state = {
        enableDoubleClick: false,
        enableRightClick: false,
        enableRandomLetters: false,
        enableRandomBrackets: false,
        enableRandomMathSymbols: false,
        enableRandomOtherSymbols: false,
        enableRandomNumbers: false,
        enableScrolling: false,
        enableDragging: false,
        enableTypeEmail: false,
        enableTypePassword: false,
        customTypeStrings: []
    }

    componentDidMount() {

    }

    updateParent()
    {
        this.props.onChange({
            enableDoubleClick: this.state.enableDoubleClick,
            enableRightClick: this.state.enableRightClick,
            enableRandomLetters: this.state.enableRandomLetters,
            enableRandomBrackets: this.state.enableRandomBrackets,
            enableRandomMathSymbols: this.state.enableRandomMathSymbols,
            enableRandomOtherSymbols: this.state.enableRandomOtherSymbols,
            enableRandomNumbers: this.state.enableRandomNumbers,
            enableScrolling: this.state.enableScrolling,
            enableDragging: this.state.enableDragging,
            enableTypeEmail: this.state.enableTypeEmail,
            enableTypePassword: this.state.enableTypePassword,
            customTypeStrings: this.state.customTypeStrings
        })
    }


    toggle(key)
    {
        this.setState({[key]: !this.state[key]}, () => this.updateParent())
    }


    addNewCustomString()
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings.push("")

        this.setState({customTypeStrings}, () => this.updateParent())
    }

    changeCustomString(index, newValue)
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings[index] = newValue;

        this.setState({customTypeStrings}, () => this.updateParent())
    }

    removeCustomString(index)
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings.splice(index, 1)

        this.setState({customTypeStrings}, () => this.updateParent())
    }


    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={true}
                                    disabled={true}
                                    value="enableClick"
                                />
                            }
                            label="Enable click action (mandatory)?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableDoubleClick}
                                    onChange={() => this.toggle('enableDoubleClick')}
                                    value="enableDoubleClick"
                                />
                            }
                            label="Enable double click action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRightClick}
                                    onChange={() => this.toggle('enableRightClick')}
                                    value="enableRightClick"
                                />
                            }
                            label="Enable right click action?"
                        />
                        <br/>
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableScrolling}*/}
                        {/*            onChange={() => this.toggle('enableScrolling')}*/}
                        {/*            value="enableScrolling"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable scrolling actions?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableDragging}*/}
                        {/*            onChange={() => this.toggle('enableDragging')}*/}
                        {/*            value="enableDragging"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable drag action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypeEmail}*/}
                        {/*            onChange={() => this.toggle('enableTypeEmail')}*/}
                        {/*            value="enableTypeEmail"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type email action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypePassword}*/}
                        {/*            onChange={() => this.toggle('enableTypePassword')}*/}
                        {/*            value="enableTypePassword"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type password action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomLetters}
                                    onChange={() => this.toggle('enableRandomLetters')}
                                    value="enableRandomLetters"
                                />
                            }
                            label="Enable type random letters action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomBrackets}
                                    onChange={() => this.toggle('enableRandomBrackets')}
                                    value="enableRandomBrackets"
                                />
                            }
                            label="Enable type random brackets action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomMathSymbols}
                                    onChange={() => this.toggle('enableRandomMathSymbols')}
                                    value="enableRandomMathSymbols"
                                />
                            }
                            label="Enable type random math symbols action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomOtherSymbols}
                                    onChange={() => this.toggle('enableRandomOtherSymbols')}
                                    value="enableRandomOtherSymbols"
                                />
                            }
                            label="Enable type random other symbols action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomNumbers}
                                    onChange={() => this.toggle('enableRandomNumbers')}
                                    value="enableRandomNumbers"
                                />
                            }
                            label="Enable type random numbers action?"
                        />
                        <br/>
                    </FormGroup>
                    <br/>
                    <br/>
                    <br/>

                    {/*{*/}
                    {/*    <Button variant="extended" color={"primary"} onClick={() => this.addNewCustomString()}>*/}
                    {/*        Add a Custom Typing Action*/}
                    {/*        <AddIcon className="rightIcon"></AddIcon>*/}
                    {/*    </Button>*/}
                    {/*}*/}

                    {
                        this.state.customTypeStrings.map((typeActionString, typeActionIndex) =>
                        {
                            return <div key={typeActionIndex}>
                                <TextField
                                    id={`type-action-${typeActionIndex}`}
                                    label={`Typing Action ${typeActionIndex + 1}`}
                                    type={"text"}
                                    value={typeActionString}
                                    onChange={(event) => this.changeCustomString(typeActionIndex, event.target.value)}
                                    margin="normal"
                                />

                                <Button variant="extended" color={"secondary"} onClick={() => this.removeCustomString(typeActionIndex)}>
                                    <DeleteIcon />
                                </Button>
                            </div>;
                        })
                    }

                </Column>
                <Column xs={3}>
                    <p>Select which of the default, built-in actions you would like to enable?</p>
                </Column>
            </Row>
        </div>;
    }
}


class ErrorsConfiguration extends Component {
    state = {
        enable5xxError: true,
        enable400Error: true,
        enable401Error: false,
        enable403Error: false,
        enable404Error: true,
        javascriptConsoleError: true,
        unhandledExceptionError: true,
        browserFreezingError: true
    }

    componentDidMount() {

    }

    updateParent()
    {
        this.props.onChange({
            enable5xxError: this.state.enable5xxError,
            enable400Error: this.state.enable400Error,
            enable401Error: this.state.enable401Error,
            enable403Error: this.state.enable403Error,
            enable404Error: this.state.enable404Error,
            javascriptConsoleError: this.state.javascriptConsoleError,
            unhandledExceptionError: this.state.unhandledExceptionError,
            browserFreezingError: this.state.browserFreezingError
        })
    }


    toggle(key)
    {
        this.setState({[key]: !this.state[key]}, () => this.updateParent())
    }


    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable5xxError}
                                    onChange={() => this.toggle('enable5xxError')}
                                    value="enable5xxError"
                                />
                            }
                            label="Treat HTTP 5xx responses as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable400Error}
                                    onChange={() => this.toggle('enable400Error')}
                                    value="enable400Error"
                                />
                            }
                            label="Treat HTTP 400 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable401Error}
                                    onChange={() => this.toggle('enable401Error')}
                                    value="enable401Error"
                                />
                            }
                            label="Treat HTTP 401 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable403Error}
                                    onChange={() => this.toggle('enable403Error')}
                                    value="enable403Error"
                                />
                            }
                            label="Treat HTTP 403 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable404Error}
                                    onChange={() => this.toggle('enable404Error')}
                                    value="enable404Error"
                                />
                            }
                            label="Treat HTTP 404 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.javascriptConsoleError}
                                    onChange={() => this.toggle('javascriptConsoleError')}
                                    value="javascriptConsoleError"
                                />
                            }
                            label="Treat Javascript console messages (severe and higher) as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.unhandledExceptionError}
                                    onChange={() => this.toggle('unhandledExceptionError')}
                                    value="unhandledExceptionError"
                                />
                            }
                            label="Treat unhandled Javascript exceptions as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.browserFreezingError}
                                    onChange={() => this.toggle('browserFreezingError')}
                                    value="browserFreezingError"
                                />
                            }
                            label="Treat browser freezing (greater then 1 second) as an error?"
                        />
                        <br/>
                    </FormGroup>
                </Column>
                <Column xs={3}>
                    <p>Select what types of errors you would like Kwola to handle?</p>
                </Column>
            </Row>
        </div>;
    }
}



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


class NewTestingRun extends Component {
    state = {
        result: '',
        tab: 0,
        paymentRequest: null,
        mode: "details",
        name: "",
        address: "",
        snackbar:false,

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
            this.setState({snackbar:true,snackbarText:'Order was completed successfully.'})
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

        if (Auth0.isUserAllowedFreeRuns())
        {
            const testingRunData = this.createDataForTestingRun();
            const price = 0;
            axios.post(`/testing_runs`, testingRunData).then((response) => {
                this.trackOrderSuccess(response.data.testingRunId, price);
                this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
            }, (error) =>
            {

                this.trackOrderFailure(price);
            },this.setState({snackbar:true,snackbarText:'Failed to launch testing run.'}));
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

    completeOrder(elements)
    {
        const price = this.calculatePrice();
        stripePromise.then((stripe) =>
        {
            const cardElement = elements.getElement(CardElement);

            stripe.createPaymentMethod({
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
                    this.trackOrderFailure(price);
                }
                else
                {
                    const testingRunData = this.createDataForTestingRun();
                    testingRunData['payment_method'] = result.paymentMethod.id;
                    axios.post(`/testing_runs`, testingRunData).then((response) => {
                        this.trackOrderSuccess(response.data.testingRunId, price);
                        this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
                    }, (error) =>
                    {
                        this.trackOrderFailure(price);
                    });
                }
            });
        })
    }

    closeSnackbar(){
        this.setState({snackbar:false});
    }
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
                                        <CheckoutPageWrapper className="checkoutPageWrapper">
                                            <Row>
                                                <FullColumn>
                                                    <div className="orderInfo">
                                                        <div className="orderTable">
                                                            <div className="orderTableHead">
                                                                <span className="tableHead">Item</span>
                                                                <span className="tableHead">Amount</span>
                                                            </div>

                                                            <div className="orderTableBody">
                                                                <div className="singleOrderInfo">
                                                                    <p>
                                                                        <span>Actions per session</span>
                                                                    </p>
                                                                    <span
                                                                        className="totalPrice">{addCommas(this.state.length)}</span>
                                                                </div>
                                                                <div className="singleOrderInfo">
                                                                    <p>
                                                                        <span>Testing sessions</span>
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
                                                            <div className="orderTableFooter">
                                                                <span>Total</span>
                                                                <span>= ${this.calculatePrice().toFixed(2)} USD / run</span>
                                                            </div>
                                                            {
                                                                this.state.mode === "details" ?
                                                                    <Button variant="extended" color="primary"
                                                                            className="orderBtn" onClick={() => this.launchTestingRunButtonClicked()}>
                                                                        Launch Testing Run
                                                                    </Button> : null
                                                            }

                                                            {
                                                                this.state.mode === "payment" ?
                                                                    <Button variant="extended" color="primary"
                                                                            className="orderBtn" onClick={() => this.completeOrder(elements)}>
                                                                        Complete Order
                                                                    </Button> : null
                                                            }
                                                        </div>
                                                    </div>
                                                </FullColumn>
                                            </Row>
                                        </CheckoutPageWrapper>
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
                          horizontal: 'right',
                        }}
                        onClick={() => this.closeSnackbar()}
                        open={this.state.snackbar} 
                        autoHideDuration={6000}
                        timeout={6000}
                        message={this.state.snackbarText ?? ""}
                    />
                </LayoutWrapper>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewTestingRun} };
export default connect(mapStateToProps)(NewTestingRun);

