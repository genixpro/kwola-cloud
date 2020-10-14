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
import LoaderButton from "../../components/LoaderButton";



class NewApplicationWizardStep6 extends Component {
    state = {

    };

    componentDidMount()
    {

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

    finishButtonClicked()
    {
        if (this.props.onFinishButtonClicked)
        {
            return this.props.onFinishButtonClicked();
        }
    }

    render()
    {
        const { result } = this.state;

        return (
            <Papersheet title={`New Application - Finish`} subtitle={`Step 6 of 6`}>
                {
                    this.props.application.package === "once" ?
                        <div>
                            <span>
                                You are now ready to launch the Kwola testing run! Please press "Launch Testing Run"
                                and your testing run will begin.
                            </span>

                            <br/>
                            <br/>
                            <br/>
                            <br/>
                        </div> : null
                }

                {
                    this.props.application.package === "monthly" ?
                        <div>
                            <span>
                                Setup is now complete.
                                Kwola now needs to launch the first testing run. During this initial testing run, Kwola
                                will collect enough data to train its neural networks. In the process, it may also find
                                some first bugs for you. You will not be charged for this testing run and it will not
                                count against your monthly quota.
                            </span>

                            <br/>
                            <br/>
                            <br/>
                            <br/>
                        </div> : null
                }

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

                        <LoaderButton onClick={() => this.finishButtonClicked()}  className={"wizard-button"}>
                            {
                                this.props.application.package === "monthly" ?
                                    <span>&nbsp;&nbsp;&nbsp;Launch First Testing Run&nbsp;&nbsp;&nbsp;<DoneIcon style={{"position": "relative", "top": "6px"}} /></span> : null
                            }
                            {
                                this.props.application.package === "once" ?
                                    <span>&nbsp;&nbsp;&nbsp;Launch Testing Run&nbsp;&nbsp;&nbsp;<DoneIcon style={{"position": "relative", "top": "6px"}} /></span> : null
                            }
                        </LoaderButton>
                    </div>
                </Row>
            </Papersheet>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep6} };
export default connect(mapStateToProps)(NewApplicationWizardStep6);

