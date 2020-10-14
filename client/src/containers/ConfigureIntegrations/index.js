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
import {Button} from "../UiElements/Button/button.style";
import ThumbDownIcon from "@material-ui/icons/ThumbDown";
import FeedbackWidget from "../FeedbackWidget";

// InputLabel


class ConfigureIntegrations extends Component {
    state = {
        application: null,
        availableJIRAProjects: [],
        availableJIRAIssueTypes: []
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
                    "redirect_uri": this.computeJIRARedirectURI()
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
            this.setState({application: response.data});
            this.loadJIRAData();
        });
    }

    loadJIRAData()
    {
        axios.get(`/application/${this.getApplicationId()}/jira`).then((response) =>
        {
            this.setState({
                availableJIRAProjects: response.data.projects,
                availableJIRAIssueTypes: response.data.issueTypes
            })
        });
    }


    computeJIRARedirectURI()
    {
        return process.env.REACT_APP_FRONTEND_URL + "app/dashboard/jira";
    }

    disconnectJIRA()
    {
        return new Promise((reject, resolve) =>
        {
            const application = this.state.application;
            application.jiraAccessToken = null;
            application.jiraCloudId = null;
            this.setState({application: application}, () => resolve(this.saveApplication()))
        });
    }


    changeJIRAProject(newProject)
    {
        const application = this.state.application;
        application.jiraProject = newProject;
        this.setState({application: application}, () => {this.saveApplication()})
    }


    changeJIRAIssueType(newIssueType)
    {
        const application = this.state.application;
        application.jiraIssueType = newIssueType;
        this.setState({application: application}, () => this.saveApplication())
    }


    saveApplication = _.debounce(() =>
    {
        axios.post(`/application/${this.getApplicationId()}`, this.state.application).then((response) =>
        {
            this.loadJIRAData();
            // this.setState({application: response.data.application})
        });
    }, 500)

    togglePushBugsToJiraEnabled()
    {
        const application = this.state.application;
        application.enablePushBugsToJIRA = !application.enablePushBugsToJIRA;
        this.setState({application}, () => this.saveApplication());
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
                            <Papersheet title={`JIRA Integration`}>
                                {
                                    this.state.application.jiraAccessToken ?
                                        <div>
                                            <FormGroup>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={this.state.application.enablePushBugsToJIRA}
                                                            onChange={() => this.togglePushBugsToJiraEnabled()}
                                                            value="enablePushBugsToJIRA"
                                                        />
                                                    }
                                                    label="Post bugs found to JIRA?"
                                                />
                                                <br/>
                                            </FormGroup>
                                            <br/>
                                            {
                                                this.state.application.enablePushBugsToJIRA ?
                                                    <FormGroup>
                                                        <FormControl>
                                                            <InputLabel id="jira-project-label">JIRA Project</InputLabel>
                                                            <Select
                                                                value={this.state.application.jiraProject}
                                                                onChange={(evt) => this.changeJIRAProject(evt.target.value)}
                                                                labelId={"jira-project-label"}
                                                                input={<Input id="jira-project" />}
                                                                placeholder={"Select a project..."}
                                                            >
                                                                {
                                                                    this.state.availableJIRAProjects.map((project) =>
                                                                    {
                                                                        return <MenuItem value={project.id} key={project.id}>
                                                                            <span>{project.name}</span>
                                                                        </MenuItem>
                                                                    })
                                                                }
                                                            </Select>
                                                        </FormControl>
                                                    </FormGroup> : null
                                            }
                                            <br/>
                                            {
                                                (this.state.application.enablePushBugsToJIRA && this.state.application.jiraProject) ? <FormGroup>
                                                    <FormControl>
                                                        <InputLabel id="jira-issue-type-label">JIRA Issue Type</InputLabel>
                                                        <Select
                                                            value={this.state.application.jiraIssueType}
                                                            onChange={(evt) => this.changeJIRAIssueType(evt.target.value)}
                                                            labelId={"jira-issue-type-label"}
                                                            input={<Input id="jira-issue-type" />}
                                                            placeholder={"Select an issue type..."}
                                                        >
                                                            {
                                                                this.state.availableJIRAIssueTypes.map((issueType) =>
                                                                {
                                                                    return <MenuItem value={issueType.id} key={issueType.id}>
                                                                        <span>{issueType.name} [{issueType.id}]</span>
                                                                    </MenuItem>
                                                                })
                                                            }
                                                        </Select>
                                                    </FormControl>
                                                </FormGroup> : null
                                            }
                                            <br/>
                                            <div style={{"display": "flex", "flexDirection": "row"}}>
                                                <LoaderButton onClick={() => this.disconnectJIRA()}>
                                                    Disconnect JIRA
                                                </LoaderButton>
                                            </div>
                                        </div> : null
                                }

                                {
                                    !this.state.application.jiraAccessToken ?
                                        <div>
                                            <a href={`https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=V5H8QVarAt0oytdolmjMzoIIrmRc1i41&scope=write%3Ajira-work%20read%3Ajira-work%20manage%3Ajira-configuration%20offline_access&redirect_uri=${encodeURIComponent(this.computeJIRARedirectURI())}&state=${this.getApplicationId()}&response_type=code&prompt=consent`}>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                 >
                                                    Connect to JIRA
                                                </Button>
                                            </a>
                                        </div> : null
                                }


                            </Papersheet>
                        </Column>
                    </Row>
                    <Row>
                        <Column xs={12} sm={12} md={9} lg={6} xl={4}>
                            <br/>
                            <Papersheet title={`Did you find the integrations you were looking for?`}>
                                <FeedbackWidget
                                    applicationId={this.getApplicationId()}
                                    placeholder={"What do you want Kwola to integrate with?"}
                                    screen={"Configure Integrations"}
                                    positiveText={"Thumbs up: I liked these integrations."}
                                    negativeText={"Thumbs down: An integration I need is missing."}
                                />
                            </Papersheet>
                        </Column>
                    </Row>
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureIntegrations} };
export default connect(mapStateToProps)(ConfigureIntegrations);

