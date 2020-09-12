import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import SingleCard from '../Shuffle/singleCard.js';
import {Button} from "../UiElements/Button/button.style";
import Icon from "../../components/uielements/icon";
import moment from 'moment';
import axios from "axios";
import Auth from "../../helpers/auth0/index"
import Tooltip from "../../components/uielements/tooltip";
import { CSVLink, CSVDownload } from "react-csv";
import FeedbackWidget from "../FeedbackWidget";
import CircularProgress from "../../components/uielements/circularProgress";
import SettingsIcon from "@material-ui/icons/Settings";
import Menus, {MenuItem} from "../../components/uielements/menus";
import {Link} from "react-router-dom";
import TestingRunsTable from "../ViewRecurringTestingTrigger/testingRunsTable";

class ViewRecurringTestingTrigger extends Component {
    state = {
        result: '',
        isAdmin: Auth.isAdmin(),
        settingsMenuOpen: false,
        testingRuns: []
    };

    componentDidMount()
    {
        axios.get(`/recurring_testing_trigger/${this.props.match.params.id}`).then((response) => {
            this.setState({recurringTestingTrigger: response.data.recurringTestingTrigger});
        });

        axios.get(`/testing_runs`, {params: {recurringTestingTriggerId: this.props.match.params.id}}).then((response) =>
        {
            this.setState({testingRuns: response.data.testingRuns})
        });
    }

    toggleSettingsMenuOpen(event)
    {
        this.setState({
            settingsMenuOpen: !this.state.settingsMenuOpen,
            settingsMenuAnchorElement: event.currentTarget
        });
    }

    closeSettingsMenuOpen()
    {
        this.setState({settingsMenuOpen: false});
    }


    render()
    {
        const { result } = this.state;

        return (
            this.state.recurringTestingTrigger ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <SingleCard src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.state.recurringTestingTrigger.applicationId}/image?token=${Auth.getQueryParameterToken()}`} grid/>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={<div>Recurring Testing Trigger</div>}
                                    button={
                                        <div>
                                            <Button variant="contained"
                                                    size="small"
                                                    color={"default"}
                                                    title={"Settings"}
                                                    aria-owns={this.state.settingsMenuOpen ? 'application-settings-menu' : null}
                                                    aria-haspopup="true"
                                                    onClick={(event) => this.toggleSettingsMenuOpen(event)}
                                            >
                                                <SettingsIcon />
                                            </Button>
                                            <Menus
                                                id="settings-menu"
                                                anchorEl={this.state.settingsMenuAnchorElement}
                                                open={this.state.settingsMenuOpen}
                                                onClose={() => this.closeSettingsMenuOpen()}
                                            >
                                                <MenuItem><Link to={`/app/dashboard/triggers/${this.props.match.params.id}/configuration`} style={{"color":"black", "textDecoration": "none"}}>View Configuration</Link></MenuItem>
                                            </Menus>
                                        </div>
                                    }
                                >

                                    <span>Trigger: {this.state.recurringTestingTrigger.repeatTrigger}</span>
                                    <br/>
                                    {
                                        this.state.recurringTestingTrigger.repeatTrigger === 'time' ?
                                            <div>
                                                <span>Repeat: Every {this.state.recurringTestingTrigger.repeatFrequency} {this.state.recurringTestingTrigger.repeatUnit}</span>
                                                <br/>
                                            </div> : null
                                    }
                                    {
                                        this.state.recurringTestingTrigger.repeatTrigger === 'commit' ?
                                            <div>
                                                <span>Repository: {this.state.recurringTestingTrigger.repositoryURL}</span>
                                                <br/>
                                            </div> : null
                                    }
                                    {
                                        this.state.recurringTestingTrigger.lastTriggerTime ?
                                            <span>Last Trigger Time: {moment(this.state.recurringTestingTrigger.lastTriggerTime.$date).format('h:mm:ss a MMM Do, YYYY')}<br/></span>
                                            : <span>Last Trigger Time: N/A<br/></span>
                                    }
                                    {
                                        this.state.recurringTestingTrigger.lastRepositoryCommitHash ?
                                            <span>Last Commit: {this.state.recurringTestingTrigger.lastRepositoryCommitHash}<br/></span>
                                            : <span>Last Commit: N/A<br/></span>
                                    }
                                </Papersheet>
                                <br/>
                                <br/>
                                {
                                    this.state.recurringTestingTrigger.status === "completed" ?
                                        <Papersheet title={`What do you think of the results?`}>
                                            <FeedbackWidget
                                                applicationId={this.state.recurringTestingTrigger.applicationId}
                                                recurringTestingTriggerId={this.state.recurringTestingTrigger._id}
                                                placeholder={"Written Feedback"}
                                                positiveText={"Thumbs up: I liked these results."}
                                                negativeText={"Thumbs down: I didn't like these results."}
                                                screen={"View Testing Run"}
                                            />
                                        </Papersheet>
                                        : null
                                }
                            </HalfColumn>
                        </Row>

                        <Row>
                            <FullColumn>
                                <Papersheet title={"Testing Runs from this trigger"}>
                                    <TestingRunsTable {...this.props} data={this.state.testingRuns} history={this.props.history} />
                                </Papersheet>
                            </FullColumn>
                        </Row>

                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewRecurringTestingTrigger} };
export default connect(mapStateToProps)(ViewRecurringTestingTrigger);

