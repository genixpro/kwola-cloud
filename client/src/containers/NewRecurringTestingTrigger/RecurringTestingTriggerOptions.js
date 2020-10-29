import AlarmIcon from '@material-ui/icons/Alarm';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CodeIcon from '@material-ui/icons/Code';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import {
    FormLabel,
    FormControl,
    FormControlLabel,
    FormHelperText,
} from '../../components/uielements/form';
import Radio from '../../components/uielements/radio';
import { RadioGroup } from '../../components/uielements/radio';
import Papersheet from "../../components/utility/papersheet";
import HourOfDaySelector from "./HourOfDaySelector";
import DaysOfMonthSelector from "../NewApplicationWizard/DaysOfMonthSelector";


class RecurringTestingTriggerOptions extends Component {
    state = {
        repeatTrigger: 'time',
        repeatFrequency: 1,
        repeatUnit: "days",
        hourOfDay: 3,
        daysOfWeekEnabled: {
            "0": false,
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false
        },
        datesOfMonthEnabled: {
            0: false,
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false,
            11: false,
            12: false,
            13: false,
            14: false,
            15: false,
            16: false,
            17: false,
            18: false,
            19: false,
            20: false,
            21: false,
            22: false,
            23: false,
            24: false,
            25: false,
            26: false,
            27: false,
            28: false,
            29: false,
            30: false
        },
        repositoryURL: "",
        repositoryUsername: "",
        repositoryPassword: "",
        repositorySSHPrivateKey: ""
    }

    componentDidMount()
    {
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
        
        if (this.props.recurringTestingTrigger)
        {
            this.setState(this.props.recurringTestingTrigger);
        }
        
        setTimeout(() =>
        {
            this.updateParent();
        }, 250)
    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        this.props.onChange({
                repeatTrigger: this.state.repeatTrigger,
                repeatFrequency: this.state.repeatFrequency,
                repeatUnit: this.state.repeatUnit,
                hourOfDay: this.state.hourOfDay,
                daysOfWeekEnabled: this.state.daysOfWeekEnabled,
                datesOfMonthEnabled: this.state.datesOfMonthEnabled,
                repositoryURL: this.state.repositoryURL,
                repositoryUsername: this.state.repositoryUsername,
                repositoryPassword: this.state.repositoryPassword,
                repositorySSHPrivateKey: this.state.repositorySSHPrivateKey
            }
        )
    }

    triggerChanged(newTrigger)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({repeatTrigger: newTrigger}, () => this.updateParent());
    }

    repeatUnitChanged(newRepeatUnit)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({repeatUnit: newRepeatUnit}, () => this.updateParent());
    }

    repeatFrequencyChanged(newFrequency)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({repeatFrequency: newFrequency}, () => this.updateParent());
    }

    hourOfDayChanged(newHour)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({hourOfDay: newHour}, () => this.updateParent());
    }

    toggleHoursEnabled(hour)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        const hoursEnabled = this.state.hoursEnabled;
        hoursEnabled[hour] = !hoursEnabled[hour];
        this.setState({hoursEnabled: hoursEnabled}, () => this.updateParent())
    }

    toggleDaysOfWeekEnabled(day)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        const daysOfWeekEnabled = this.state.daysOfWeekEnabled;
        daysOfWeekEnabled[day] = !daysOfWeekEnabled[day];
        this.setState({daysOfWeekEnabled: daysOfWeekEnabled}, () => this.updateParent())
    }


    changeRepositoryField(field, newValue)
    {
        if (this.props.disabled)
        {
            // Do nothing
            return;
        }

        this.setState({[field]: newValue}, () => this.updateParent());
    }


    datesOfMonthChanged(datesOfMonth)
    {
        this.setState({datesOfMonthEnabled: datesOfMonth});
    }

    render() {
        const body = <div>
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    {/*<Button*/}
                    {/*    variant="extended"*/}
                    {/*    color={this.state.repeatTrigger === 'once' ? "primary" : "default"}*/}
                    {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                    {/*    onClick={() => this.triggerChanged('once')}>*/}
                    {/*    One Time*/}
                    {/*    <SkipNextIcon />*/}
                    {/*</Button>*/}
                    <Button
                        variant="extended"
                        color={this.state.repeatTrigger === 'time' ? "primary" : "default"}
                        style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        onClick={() => this.triggerChanged('time')}>
                        Scheduled
                        <AlarmIcon className="rightIcon" />
                    </Button>
                    <Button
                        variant="extended"
                        color={this.state.repeatTrigger === 'commit' ? "primary" : "default"}
                        onClick={() => this.triggerChanged('commit')}
                        style={{"cursor": this.props.disabled ? "default" : "pointer"}}>
                        Repository Commit
                        <CodeIcon className="rightIcon" />
                    </Button>
                    {/*<Button*/}
                    {/*    variant="extended"*/}
                    {/*    color={this.state.repeatTrigger === 'webhook' ? "primary" : "default"}*/}
                    {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                    {/*    onClick={() => this.triggerChanged('webhook')}>*/}
                    {/*    Webhook*/}
                    {/*    <CloudUploadIcon className="rightIcon" />*/}
                    {/*</Button>*/}
                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select the trigger for your testing runs.</p>
                        </Column> : null
                }
            </Row>
            {
                this.state.repeatTrigger === 'once' ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <OneFourthColumn>

                                </OneFourthColumn>
                                : null
                        }
                    </Row>: null
            }
            {
                this.state.repeatTrigger === 'time' ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                        <div>
                            <div style={{"display":"flex", "flexDirection":"row", "alignItems":"flex-start"}}>
                                <div style={{"flexBasis": "100px", "marginTop": "3px", "flexGrow": "0"}}>Repeat every</div>

                                <div style={{"paddingLeft": "10px"}}>
                                    <TextField
                                        type="number"
                                        value={this.state.repeatFrequency}
                                        min={1}
                                        max={100}
                                        onChange={(event, newValue) => this.repeatFrequencyChanged(newValue)}
                                    />
                                </div>
                                <div style={{"paddingLeft": "10px"}}>
                                    <TextField
                                        id="select-currency-native"
                                        select
                                        value={this.state.repeatUnit}
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
                                        <option value={"months_by_date"}>
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
                                        <div style={{"flexBasis": "100px", "marginTop": "5px", "flexGrow":"0"}}>Run at</div>
                                        : null
                                }
                                {
                                    this.state.repeatUnit === "days" || this.state.repeatUnit === "weeks" || this.state.repeatUnit === "months_by_date" ?
                                        <div style={{"flexGrow": "1"}}>
                                            <HourOfDaySelector
                                                value={this.state.hourOfDay}
                                                onChange={(newHour) => this.hourOfDayChanged(newHour)} />
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
                                                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayOfWeek, dayOfWeekIndex) =>
                                                            <Button variant="extended"
                                                                    color={this.state.daysOfWeekEnabled[dayOfWeekIndex] ? "primary" : "default"}
                                                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                                                    onClick={() => this.toggleDaysOfWeekEnabled(dayOfWeekIndex)}>
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
                                this.state.repeatUnit === "months_by_date" ?
                                    <DaysOfMonthSelector
                                        value={this.props.datesOfMonthEnabled}
                                        onChange={(datesOfMonth) => this.datesOfMonthChanged(datesOfMonth)}
                                        maxDaysSelected={5}
                                    />
                                    : null
                            }
                        </div>
                    </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>These options will change how frequently Kwola runs.
                                        Please note that running Kwola more frequently
                                        will result in greater charges.</p>
                                </Column> : null
                        }
                </Row>: null
            }
            {
                this.state.repeatTrigger === 'commit' ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                            <div>
                                <TextField
                                    id="repositoryURL"
                                    label="Git Repository URL"
                                    value={this.state.repositoryURL}
                                    onChange={(event) => this.changeRepositoryField('repositoryURL', event.target.value)}
                                    margin="normal"
                                    style={{"width": "80%"}}
                                />
                                <br/>
                                <br/>
                                <TextField
                                    id="repositoryUsername"
                                    label="Username"
                                    value={this.state.repositoryUsername}
                                    onChange={(event) => this.changeRepositoryField('repositoryUsername', event.target.value)}
                                    margin="normal"
                                    style={{"width": "60%"}}
                                />
                                <br/>
                                <TextField
                                    id="repositoryPassword"
                                    label="Password"
                                    value={this.state.repositoryPassword}
                                    onChange={(event) => this.changeRepositoryField('repositoryPassword', event.target.value)}
                                    margin="normal"
                                    style={{"width": "60%"}}
                                />
                                <br/>
                                <br/>
                                or
                                <br />
                                <TextField
                                    id="repositorySSHPrivateKey"
                                    label="SSH Private Key"
                                    multiline
                                    value={this.state.repositorySSHPrivateKey}
                                    onChange={(event) => this.changeRepositoryField('repositorySSHPrivateKey', event.target.value)}
                                    margin="normal"
                                    style={{"width": "80%"}}
                                />
                            </div>
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>These options will change how frequently Kwola runs.
                                        Please note that running Kwola more frequently
                                        will result in greater charges.</p>
                                </Column> : null
                        }
                    </Row>: null
            }
            {
                this.state.repeatTrigger === 'webhook' ?
                    <Row>
                        <Column xs={this.props.hideHelp ? 12 : 9}>
                            <div>

                            </div>
                        </Column>
                        {
                            !this.props.hideHelp ?
                                <Column xs={3}>
                                    <p>
                                        Use a POST request to this URL in order to trigger your testing run.
                                    </p>
                                </Column> : null
                        }
                    </Row>: null
            }
        </div>;

        if (!this.props.hideFrame)
        {
            return <Papersheet
                title={`Trigger Options`}
                subtitle={``}
            >{body}</Papersheet>;
        }
        else
        {
            return body;
        }
    }
}



const mapStateToProps = (state) => {return { ...state.RecurringTestingTriggerOptions} };
export default connect(mapStateToProps)(RecurringTestingTriggerOptions);

