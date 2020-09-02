import AlarmIcon from '@material-ui/icons/Alarm';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CodeIcon from '@material-ui/icons/Code';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';

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



const mapStateToProps = (state) => {return { ...state.RecurringOptions} };
export default connect(mapStateToProps)(RecurringOptions);

