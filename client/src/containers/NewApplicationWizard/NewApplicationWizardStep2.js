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
import "./main.scss";
import SizeOfRun from "../NewTestingRun/SizeOfRun";


class NewApplicationWizardStep2 extends Component {
    state = {

    };

    componentDidMount()
    {

    }

    changeRunConfiguration(newValues)
    {
        if (this.props.onChangeRunConfiguration)
        {
            this.props.onChangeRunConfiguration(newValues);
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
            <Papersheet title={`New Application - Select Actions`} subtitle={`Step 2 of 6`}>
                <p>Here you can select what things Kwola is allowed to "do" with your application, e.g. what things it can type into text boxes, and whether it is allowed to scroll or not. Generally the fewer actions you enable, the faster Kwola's AI will learn. but you should enable all actions that will be needed to trigger various functionality on your UI. <strong>If your unsure, just leave the default options selected.</strong></p>
                <ActionsConfiguration
                    defaultRunConfiguration={this.props.runConfiguration}
                    onChange={(data) => this.changeRunConfiguration(data)}
                    hideWrapper={true}
                    hideHelp={true}
                />
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

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep2} };
export default connect(mapStateToProps)(NewApplicationWizardStep2);

