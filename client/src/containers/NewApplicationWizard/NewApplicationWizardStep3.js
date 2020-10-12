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
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import RecurringTestingTriggerOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import PackageSelector from "./PackageSelector";
import "./main.scss";


class NewApplicationWizardStep3 extends Component {
    state = {

    };

    componentDidMount()
    {

    }

    changePackage(newPackage)
    {
        if (this.props.onApplicationFieldChanged)
        {
            this.props.onApplicationFieldChanged("package", newPackage);
        }
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

    render()
    {
        const { result } = this.state;

        return (
            <Papersheet title={`New Application - Select Package`} subtitle={`Step 3 of 6`}>
                <PackageSelector
                    selectedPackage={this.props.application.package}
                    onChangePackage={(name) => this.changePackage(name)}
                />
                <br/>
                <br/>
                <Row>
                    <div className={"wizard-navigation-buttons"}>
                        <Button variant="contained"
                                size="medium"
                                color={"secondary"}
                                className={"wizard-button"}
                                title={"Previous Step"}
                                onClick={(event) => this.previousPageClicked(event)}>
                            <span><NavigateBeforeIcon style={{"position": "relative", "top": "6px"}} /> Previous&nbsp;&nbsp;&nbsp;</span>
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

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep3} };
export default connect(mapStateToProps)(NewApplicationWizardStep3);

