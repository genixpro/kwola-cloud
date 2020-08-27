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
                axios.post(`/application/${this.props.match.params.id}/slack`, {
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

    loadApplication()
    {
        axios.get(`/application/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({application: response.data})
            this.loadAvailableSlackChannels();
        });
    }


    loadAvailableSlackChannels()
    {
        axios.get(`/application/${this.props.match.params.id}/slack`).then((response) =>
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

    saveApplication()
    {
        axios.post(`/application/${this.props.match.params.id}`, this.state.application).then((response) =>
        {
            // this.setState({application: response.data.application})
        });
    }

    computeSlackRedirectURI()
    {
        return process.env.REACT_APP_FRONTEND_URL + "app/dashboard/applications/" + this.props.match.params.id + "/notifications";
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
        return axios.post(`/application/${this.props.match.params.id}/slack/test`, this.state.application).then((response) =>
        {

        });
    }


    changeSlackChannel(newChannel)
    {
        const application = this.state.application;
        application.slackChannel = newChannel;
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
                        <Column xs={12} sm={10} md={8} lg={6} xl={4}>
                            <Papersheet
                                title={`Configure Notifications`}
                                // subtitle={}
                            >
                                <h4>Slack Notifications</h4>
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
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureNotifications} };
export default connect(mapStateToProps)(ConfigureNotifications);

