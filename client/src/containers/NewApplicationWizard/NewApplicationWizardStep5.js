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
import DoneIcon from '@material-ui/icons/Done';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import RecurringTestingTriggerOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import PaymentDetailsSection from "../NewTestingRun/PaymentDetailsSection";
import "./main.scss";
import { RadioGroup } from '../../components/uielements/radio';
import Radio from '../../components/uielements/radio';
import {
    FormLabel,
    FormControl,
    FormHelperText,
} from '../../components/uielements/form';
import DayOfWeekSelector from "./DayOfWeekSelector";
import HourOfDaySelector from "../NewRecurringTestingTrigger/HourOfDaySelector";
import DaysOfMonthSelector from "./DaysOfMonthSelector";



class NewApplicationWizardStep5 extends Component {
    state = {};

    componentDidMount()
    {

    }


    changeLaunchMethod(newMethod)
    {
        this.changeParentApplicationField("launchMethod", newMethod);
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

    dayOfWeekChanged(newDayOfWeek)
    {
        this.changeParentApplicationField("dayOfWeek", newDayOfWeek);
    }


    hourOfDayChanged(newHourOfDay)
    {
        this.changeParentApplicationField("hourOfDay", newHourOfDay);
    }


    datesOfMonthChanged(datesOfMonth)
    {
        this.changeParentApplicationField("datesOfMonth", datesOfMonth);
    }

    changeParentApplicationField(field, newValue)
    {
        this.props.onApplicationFieldChanged(field, newValue);
    }

    changeParentRunConfigurationField(field, newValue)
    {
        this.props.onRunConfigurationFieldChanged(field, newValue);
    }

    render()
    {
        const { result } = this.state;

        return (
            <Papersheet title={`New Application - Setup Recurring Trigger`} subtitle={`Step 5 of 6`}>
                <div>
                    <FormControl
                        component="fieldset"
                    >
                        <span>How do you want to launch your testing runs?<br/><br/></span>

                        <RadioGroup
                            aria-label="launch_method"
                            name="launch_method_selector"
                            value={this.props.application.launchMethod}
                            onChange={(evt) => this.changeLaunchMethod(evt.target.value)}
                        >
                            <FormControlLabel
                                value="weekly"
                                control={<Radio />}
                                label="Every week on a specific day"
                            />
                            <FormControlLabel
                                value="date_of_month"
                                control={<Radio />}
                                label="Specific days of the month"
                            />
                            <FormControlLabel
                                value="manual"
                                control={<Radio />}
                                label="Manually launch them through the UI or API"
                            />
                        </RadioGroup>
                    </FormControl>

                    {
                        this.props.application.launchMethod === "weekly" ?
                            <div className={"day-of-week-widget"}>
                                <span>
                                    Every&nbsp;&nbsp;&nbsp;
                                </span>
                                <DayOfWeekSelector
                                    value={this.props.application.dayOfWeek}
                                    onChange={(newDay) => this.dayOfWeekChanged(newDay)}
                                />
                                <span>
                                    &nbsp;&nbsp;&nbsp;at&nbsp;&nbsp;&nbsp;
                                </span>
                                <HourOfDaySelector
                                    value={this.props.application.hourOfDay}
                                    onChange={(newDay) => this.hourOfDayChanged(newDay)}
                                />
                            </div> : null
                    }

                    {
                        this.props.application.launchMethod === "date_of_month" ?
                            <div className={"day-of-month-widget"}>
                                <span>Run at&nbsp;&nbsp;</span>
                                <HourOfDaySelector
                                    value={this.props.application.hourOfDay}
                                    onChange={(newDay) => this.hourOfDayChanged(newDay)}
                                />
                                <DaysOfMonthSelector
                                    value={this.props.application.datesOfMonth}
                                    onChange={(datesOfMonth) => this.datesOfMonthChanged(datesOfMonth)}
                                    maxDaysSelected={5}
                                />
                            </div> : null
                    }
                    <br/>
                    <br/>
                    <br/>
                    <br/>
                </div>

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
                                onClick={(event) => this.nextPageClicked(event)}>
                            <span>&nbsp;&nbsp;&nbsp;Next <NavigateNextIcon style={{"position": "relative", "top": "6px"}} /></span>
                        </Button>
                    </div>
                </Row>
            </Papersheet>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep5} };
export default connect(mapStateToProps)(NewApplicationWizardStep5);

