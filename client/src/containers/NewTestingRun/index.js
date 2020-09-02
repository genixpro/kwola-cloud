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


class AutologinCredentials extends Component {
    state = {
        autologin: false,
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


class PathWhitelistConfiguration extends Component {
    state = {
        enablePathWhitelist: false,
        pathRegexes: [],
        testerOpen: {},
        testURL: ""
    }

    updateParent()
    {
        if (this.state.enablePathWhitelist)
        {
            this.props.onChange({
                enablePathWhitelist: this.state.enablePathWhitelist,
                pathRegexes: this.state.pathRegexes.map((pattern, index) =>
                {
                    if (!this.isRegexValid(index))
                    {
                        return ".*"
                    }
                    else
                    {
                        return pattern;
                    }
                })
            })
        }
        else
        {
            this.props.onChange({
                enablePathWhitelist: this.state.enablePathWhitelist,
                pathRegexes: []
            })
        }
    }

    componentDidMount()
    {

    }


    togglePathWhitelist()
    {
        this.setState({enablePathWhitelist: !this.state.enablePathWhitelist}, () => this.updateParent());
    }


    addNewPathRegex()
    {
        const pathRegexes = this.state.pathRegexes;
        const testerOpen = this.state.testerOpen;
        pathRegexes.push(".*")
        testerOpen[pathRegexes.length-1] = false;
        this.setState({pathRegexes}, () => this.updateParent())
    }


    changePathRegex(index, newValue)
    {
        const pathRegexes = this.state.pathRegexes;
        pathRegexes[index] = newValue;
        this.setState({pathRegexes}, () => this.updateParent())
    }

    changeTestURL(newValue)
    {
        this.setState({testURL: newValue})
    }

    removePathRegex(index)
    {
        const pathRegexes = this.state.pathRegexes;
        pathRegexes.splice(index, 1);
        this.setState({pathRegexes}, () => this.updateParent())
    }

    toggleRegexTester(index)
    {
        if (!this.state.testURL)
        {
            this.setState({testURL: this.props.application.url});
        }

        const testerOpen = this.state.testerOpen;
        testerOpen[index] = !testerOpen[index];
        this.setState({testerOpen: testerOpen});
    }

    getModalStyle()
    {
        const top = 50 ;
        const left = 50;

        return {
            position: 'absolute',
            width: 16 * 50,
            top: `${top}%`,
            left: `${left}%`,
            transform: `translate(-${top}%, -${left}%)`,
            border: '1px solid #e5e5e5',
            backgroundColor: '#fff',
            boxShadow: '0 5px 15px rgba(0, 0, 0, .5)',
            padding: 8 * 4,
        };
    }

    getRegexpMatchingCharacters(index)
    {
        const testURLIsCharMatch = [];
        for(let char of this.state.testURL)
        {
            testURLIsCharMatch.push({
                "char": char,
                "match": false
            });
        }

        if (!this.isRegexValid(index))
        {
            return testURLIsCharMatch;
        }

        const pattern = new RegExp(this.state.pathRegexes[index], "g");
        const matches = [...this.state.testURL.matchAll(pattern)];
        if (matches.length > 0) {
            for (let match of matches) {
                let startIndex = this.state.testURL.indexOf(match[0]);
                for (let c = startIndex; c < (startIndex + match[0].length); c += 1) {
                    testURLIsCharMatch[c].match = true;
                }
            }
        }

        return testURLIsCharMatch;
    }

    isRegexValid(index)
    {
        if (!this.state.pathRegexes[index])
        {
            return false;
        }
        try
        {
            new RegExp(this.state.pathRegexes[index]);
            return true;
        }
        catch (e)
        {
            return false;
        }
    }


    testRegexp(index)
    {
        if (!this.isRegexValid(index))
        {
            return false;
        }

        const pattern = new RegExp(this.state.pathRegexes[index]);
        return pattern.test(this.state.testURL);
    }

    render() {
        return <div>
            <Row>
                <Column xs={12}  md={12} lg={9}>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enablePathWhitelist}
                                    onChange={() => this.togglePathWhitelist()}
                                    value="autologin"
                                />
                            }
                            label="Enable whitelist of target paths / URLs?"
                        />
                    </FormGroup>
                    {
                        this.state.enablePathWhitelist ?
                            <div>
                                <br/>
                                <br/>
                                <br/>
                                <br/>
                                {
                                    this.state.pathRegexes.map((pathRegexString, pathRegexIndex) =>
                                    {
                                        return <div key={pathRegexIndex}>
                                            <TextField
                                                id={`regex-string-${pathRegexIndex}`}
                                                label={`Path Regex ${pathRegexIndex + 1}`}
                                                type={"text"}
                                                value={pathRegexString}
                                                onChange={(event) => this.changePathRegex(pathRegexIndex, event.target.value)}
                                                margin="normal"
                                            />

                                            <Button variant="extended" color={"secondary"} onClick={() => this.removePathRegex(pathRegexIndex)}>
                                                <DeleteIcon />
                                            </Button>
                                            <Button variant="extended" color={"primary"} onClick={() => this.toggleRegexTester(pathRegexIndex)}>
                                                Test
                                            </Button>
                                            <Modal
                                                aria-labelledby={"regex-tester-modal-title"}
                                                aria-describedby="regex-tester-modal-description"
                                                open={this.state.testerOpen[pathRegexIndex]}
                                                onClose={() => this.toggleRegexTester(pathRegexIndex)}
                                            >
                                                <div style={this.getModalStyle()}>
                                                    <Typography variant="h6" id="modal-title">
                                                        Regular Expression Tester
                                                    </Typography>
                                                    <Typography variant="subtitle1" id="regex-tester-modal-description">
                                                        <TextField
                                                            id={`regex-string-${pathRegexIndex}-2`}
                                                            label={`Regex String`}
                                                            style={{"width": "100%"}}
                                                            type={"text"}
                                                            value={pathRegexString}
                                                            onChange={(event) => this.changePathRegex(pathRegexIndex, event.target.value)}
                                                            margin="normal"
                                                        />
                                                        <br/>
                                                        <TextField
                                                            id={`regex-test-url-${pathRegexIndex}`}
                                                            label={`Test URL`}
                                                            style={{"width": "100%"}}
                                                            type={"text"}
                                                            value={this.state.testURL}
                                                            onChange={(event) => this.changeTestURL(event.target.value)}
                                                            margin="normal"
                                                        />
                                                        <br/>
                                                        <br/>
                                                        <div>
                                                            <span>Match:</span>
                                                            {
                                                                this.getRegexpMatchingCharacters(pathRegexIndex).map((char, charIndex) =>
                                                                {
                                                                    const style = {};
                                                                    if(char.match)
                                                                    {
                                                                        style["backgroundColor"] = "aqua";
                                                                    }
                                                                    return <span style={style} key={charIndex}>{char.char}</span>
                                                                })
                                                            }
                                                        </div>
                                                        <div>
                                                            <span>Regex Valid?&nbsp;&nbsp;</span>
                                                            <span>{this.isRegexValid(pathRegexIndex).toString()}</span>
                                                        </div>
                                                        <div>
                                                            <span>URL Allowed?&nbsp;&nbsp;</span>
                                                            <span>{this.testRegexp(pathRegexIndex).toString()}</span>
                                                        </div>
                                                    </Typography>
                                                </div>
                                            </Modal>
                                        </div>;
                                    })
                                }
                                {
                                    <Button variant="extended" color={"primary"} onClick={() => this.addNewPathRegex()}>
                                        Add a Path Regex
                                        <AddIcon className="rightIcon"></AddIcon>
                                    </Button>
                                }
                            </div> : null
                    }
                </Column>
                <Column xs={12}  md={12} lg={3}>
                    <p>Select whether you want to keep Kwola constrained within URL's that match your provided regexes.</p>
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

