import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import 'plyr/dist/plyr.css'
import {FormControlLabel, FormGroup} from "../../components/uielements/form";
import Checkbox from "../../components/uielements/checkbox";
import LoaderButton from "../../components/LoaderButton";
import Input from "../../components/uielements/input";
import {MenuItem} from "../../components/uielements/menus";
import {Select} from "../UiElements/Select/select.style";
import {FormControl, InputLabel} from "@material-ui/core";
import Promise from "bluebird";
import TextField from "../../components/uielements/textfield";
import Auth from "../../helpers/auth0/index"
import _ from "underscore";
import FeedbackWidget from "../FeedbackWidget";

// InputLabel


class ConfigureNotifications extends Component {
    state = {
        application: null,
        availableSlackChannels: []
    };

    componentDidMount()
    {
        if (window.location.search)
        {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('code'))
            {
                axios.post(`/application/${this.getApplicationId()}/slack`, {
                    "code": urlParams.get("code"),
                    "redirect_uri": this.computeSlackRedirectURI()
                }).then((response) =>
                {
                    this.loadApplication();
                });

                window.location.search = "";
            }
            else
            {
                this.loadApplication();
            }
        }
        else
        {
            this.loadApplication();
        }
    }

    getApplicationId()
    {
        return this.props.match.params.id;
    }

    loadApplication()
    {
        axios.get(`/application/${this.getApplicationId()}`).then((response) =>
        {
            this.setState({application: response.data})
            this.loadAvailableSlackChannels();
        });
    }


    loadAvailableSlackChannels()
    {
        axios.get(`/application/${this.getApplicationId()}/slack`).then((response) =>
        {
            this.setState({availableSlackChannels: response.data.channels})
        });
    }


    toggleNotificationEnabled(field)
    {
        const application = this.state.application;
        application[field] = !application[field];
        this.setState({application: application}, () => this.saveApplication())
    }

    saveApplication = _.debounce(() =>
    {
        axios.post(`/application/${this.getApplicationId()}`, this.state.application).then((response) =>
        {
            // this.setState({application: response.data.application})
        });
    }, 500)

    computeSlackRedirectURI()
    {
        return process.env.REACT_APP_FRONTEND_URL + "app/dashboard/applications/" + this.getApplicationId() + "/notifications";
    }

    disconnectSlack()
    {
        return new Promise((reject, resolve) =>
        {
            const application = this.state.application;
            application.slackAccessToken = null;
            application.slackChannel = null;
            this.setState({application: application}, () => resolve(this.saveApplication()))
        });
    }


    testSlack()
    {
        return axios.post(`/application/${this.getApplicationId()}/slack/test`, this.state.application).then((response) =>
        {

        });
    }


    changeSlackChannel(newChannel)
    {
        const application = this.state.application;
        application.slackChannel = newChannel;
        this.setState({application: application}, () => this.saveApplication())
    }


    notificationEmailChanged(newValue)
    {
        const application = this.state.application;
        application.overrideNotificationEmail = newValue;
        this.setState({application: application}, () => this.saveApplication())
    }


    render() {
        const { result } = this.state;

        if (!this.state.application)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <Column xs={12} sm={12} md={9} lg={6} xl={4}>
                            <Papersheet
                                title={`Email Notifications`}
                            >
                                <div>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.application.enableEmailNewTestingRunNotifications}
                                                    onChange={() => this.toggleNotificationEnabled('enableEmailNewTestingRunNotifications')}
                                                    value="enableEmailNewTestingRunNotifications"
                                                />
                                            }
                                            label="Email when a testing run is started?"
                                        />
                                        <br/>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.application.enableEmailNewBugNotifications}
                                                    onChange={() => this.toggleNotificationEnabled('enableEmailNewBugNotifications')}
                                                    value="enableEmailNewBugNotifications"
                                                />
                                            }
                                            label="Email when a bug is found?"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.application.enableEmailTestingRunCompletedNotifications}
                                                    onChange={() => this.toggleNotificationEnabled('enableEmailTestingRunCompletedNotifications')}
                                                    value="enableEmailTestingRunCompletedNotifications"
                                                />
                                            }
                                            label="Email when a testing run is completed?"
                                        />
                                        <TextField
                                            id="notification-email"
                                            label="Notification Email"
                                            title={"Notification Email"}
                                            type={"text"}
                                            placeholder={`Default: ${Auth.getUserInfo()['email']}`}
                                            value={this.state.application.overrideNotificationEmail}
                                            onChange={(event) => this.notificationEmailChanged(event.target.value)}
                                            margin="normal"
                                        />
                                        <br/>
                                    </FormGroup>
                                </div>
                            </Papersheet>
                        </Column>
                    </Row>


                    <Row>
                        <Column xs={12} sm={12} md={9} lg={6} xl={4}>
                            <Papersheet title={`Slack Notifications`}>
                                {
                                    this.state.application.slackAccessToken ?
                                        <div>
                                            <FormGroup>
                                                <FormControl>
                                                    <InputLabel id="slack-channel-label">Slack Channel</InputLabel>
                                                    <Select
                                                        value={this.state.application.slackChannel}
                                                        onChange={(evt) => this.changeSlackChannel(evt.target.value)}
                                                        labelId={"slack-channel-label"}
                                                        input={<Input id="slack-channel" />}
                                                        placeholder={"Select a channel..."}
                                                    >
                                                        {
                                                            this.state.availableSlackChannels.map((channel) =>
                                                            {
                                                                return <MenuItem value={channel} key={channel}>
                                                                    <span>#{channel}</span>
                                                                </MenuItem>
                                                            })
                                                        }
                                                    </Select>
                                                </FormControl>
                                            </FormGroup>
                                            <br/>
                                            <FormGroup>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={this.state.application.enableSlackNewBugNotifications}
                                                            onChange={() => this.toggleNotificationEnabled('enableSlackNewBugNotifications')}
                                                            value="enableSlackNewBugNotifications"
                                                        />
                                                    }
                                                    label="Notify when a new bug is found?"
                                                />
                                                <br/>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={this.state.application.enableSlackTestingRunCompletedNotifications}
                                                            onChange={() => this.toggleNotificationEnabled('enableSlackTestingRunCompletedNotifications')}
                                                            value="enableSlackTestingRunCompletedNotifications"
                                                        />
                                                    }
                                                    label="Notify when a testing run is finished?"
                                                />
                                                <br/>
                                            </FormGroup>
                                            <br/>
                                            <div style={{"display": "flex", "flexDirection": "row"}}>
                                                <LoaderButton onClick={() => this.testSlack()}>
                                                    Test Notification
                                                </LoaderButton>
                                                <LoaderButton onClick={() => this.disconnectSlack()}>
                                                    Disconnect Slack
                                                </LoaderButton>
                                            </div>
                                        </div> : null
                                }

                                {
                                    !this.state.application.slackAccessToken ?
                                        <div>
                                            <a href={`https://slack.com/oauth/v2/authorize?client_id=1312504467012.1339775540961&scope=chat:write,chat:write.public,channels:read&user_scope=&redirect_uri=${encodeURIComponent(this.computeSlackRedirectURI())}`}>
                                                <img alt="Add to Slack"
                                                     height="40"
                                                     width="139"
                                                     src="https://platform.slack-edge.com/img/add_to_slack.png"
                                                     srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
                                            </a>
                                        </div> : null
                                }


                            </Papersheet>
                        </Column>
                    </Row>
                    <Row>
                        <Column xs={12} sm={12} md={9} lg={6} xl={4}>
                            <br/>
                            <Papersheet title={`Did you find the notifications you were looking for?`}>
                                <FeedbackWidget
                                    applicationId={this.getApplicationId()}
                                    placeholder={"What kind of notifications do you want?"}
                                    screen={"Configure Notifications"}
                                    positiveText={"Thumbs up: I liked these notifications."}
                                    negativeText={"Thumbs down: A notification I need is missing."}
                                />
                            </Papersheet>
                        </Column>
                    </Row>
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureNotifications} };
export default connect(mapStateToProps)(ConfigureNotifications);

