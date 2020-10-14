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
import SettingsIcon from "@material-ui/icons/Settings";
import {Button} from "../UiElements/Button/button.style";
import PublishIcon from '@material-ui/icons/Publish';
import ErrorIcon from '@material-ui/icons/Error';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CircularProgress from "../../components/uielements/circularProgress";

// InputLabel
/*

 */

class ConfigureWebhooks extends Component {
    state = {
        application: null,
        hookTestState: {}
    };

    hooks = [
        {
            field: "testingRunStartedWebhookURL",
            label: "Testing Run Started Webhook",
            description: "This webhook will be called anytime a new testing run is started, either manually or from a trigger. Use it to reset your environments database back to a clean testing dataset."
        },
        {
            field: "testingRunFinishedWebhookURL",
            label: "Testing Run Finished Webhook",
            description: "This webhook will be called anytime a testing run has finished running. Use to process the final results from a testing run."
        },
        {
            field: "browserSessionWillStartWebhookURL",
            label: "Browser Session Will Start Webhook",
            description: "This webhook will is called every time that a new web-browser session is about to start executing on your application. You can use it to reset the database or provide a unique username / password to Kwola for each browser session (so that different browser sessions do not interact with each other.)"
        },
        {
            field: "browserSessionFinishedWebhookURL",
            label: "Browser Session Finished Webhook",
            description: "This webhook is called every time that a web-browser session is finished executing on your application. Use it to clear any resources or database entries that might have been created by this browser session."
        },
        {
            field: "bugFoundWebhookURL",
            label: "Bug Found Webhook",
            description: "This webhook is called every time that a bug is found in your target application. Use it to record the bug in your bug-tracking system or trigger other custom notifications."
        }
    ]

    componentDidMount()
    {
        this.loadApplication();
        const hookTestState = this.state.hookTestState;
        for (let hook of this.hooks)
        {
            hookTestState[hook.field] = null;
        }
        this.setState({hookTestState: hookTestState});
    }

    loadApplication()
    {
        axios.get(`/application/${this.getApplicationId()}`).then((response) =>
        {
            this.setState({application: response.data});
        });
    }

    getApplicationId()
    {
        return this.props.match.params.id;
    }

    changeWebhookURL(field, newValue)
    {
        const application = this.state.application;
        application[field] = newValue;
        this.setState({application: application}, () => this.saveApplication());
    }


    saveApplication = _.debounce(() =>
    {
        // Don't save invalid urls
        if (this.checkAllURLsValid())
        {
            axios.post(`/application/${this.getApplicationId()}`, this.state.application).then((response) =>
            {
                // this.setState({application: response.data.application})
            });
        }
    }, 500)


    static isValidURL(myURL)
    {
        const pattern = new RegExp('^(https?:\\/\\/)'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ //port
            '(\\?[;&amp;a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i');
        return pattern.test(myURL);
    }

    checkAllURLsValid()
    {
        for (let hookInfo of this.hooks)
        {
            if (this.state.application[hookInfo.field] && !ConfigureWebhooks.isValidURL(this.state.application[hookInfo.field]))
            {
                return false;
            }
        }
        return true;
    }

    testWebhook(hookField)
    {
        let hookTestState = this.state.hookTestState;
        hookTestState[hookField] = "loading";
        this.setState({hookTestState})

        axios.post(`/application/${this.getApplicationId()}/webhook/${hookField}/test`, this.state.application).then((response) =>
        {
            hookTestState[hookField] = response.data.success;
            this.setState({hookTestState})

            setTimeout(() => {
                hookTestState[hookField] = null;
                this.setState({hookTestState});
            }, 2500);
        }, (err) =>
        {
            hookTestState[hookField] = false;
            this.setState({hookTestState});

            setTimeout(() => {
                hookTestState[hookField] = null;
                this.setState({hookTestState});
            }, 2500);
        });
    }

    render()
    {
        const { result } = this.state;

        if (!this.state.application)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <Column xs={12} sm={12} md={10} lg={8} xl={6}>
                            <Papersheet title={`Configuration Webhooks`}>
                                {
                                    this.hooks.map((hook) =>
                                    {
                                        return <Row>
                                                <Column xs={8} style={{"display":"flex", "justifyContent": "flex-start", "alignItems": "baseline"}}>
                                                    <TextField
                                                        id={hook.field}
                                                        label={hook.label}
                                                        value={this.state.application[hook.field]}
                                                        onChange={(event) => this.changeWebhookURL(hook.field, event.target.value)}
                                                        margin="normal"
                                                        style={{"flexBasis": "80%"}}
                                                    />
                                                    {
                                                        (this.state.application[hook.field] && ConfigureWebhooks.isValidURL(this.state.application[hook.field])) ?
                                                            <Button variant="contained"
                                                                    size="small"
                                                                    color={"default"}
                                                                    title={"Test your webhook now"}
                                                                    style={{"marginLeft": "20px", "paddingLeft": "20px", "paddingRight": "15px"}}
                                                                    onClick={(event) => this.testWebhook(hook.field)}
                                                            >
                                                                Test <PublishIcon />
                                                                {
                                                                    (this.state.hookTestState[hook.field] === "loading") ?
                                                                        <CircularProgress size={14} color="white"/>
                                                                        : null
                                                                }
                                                            </Button>
                                                            : null
                                                    }
                                                    {
                                                        (this.state.hookTestState[hook.field] === true) ?
                                                            <div style={{"marginLeft": "20px", "color": "green"}} title={"The event was successfully sent to your webhook."}>
                                                                <CheckCircleIcon />
                                                            </div>
                                                            : null
                                                    }
                                                    {
                                                        (this.state.hookTestState[hook.field] === false) ?
                                                            <div style={{"marginLeft": "20px", "color": "red"}} title={"There was an error while trying to contact your webhook."}>
                                                                <ErrorIcon />
                                                            </div>
                                                            : null
                                                    }

                                                    {
                                                        (this.state.application[hook.field] && !ConfigureWebhooks.isValidURL(this.state.application[hook.field])) ?
                                                            <div style={{"marginLeft": "20px", "color": "red"}} title={"Your webhook is not a valid URL"}>
                                                                <ErrorIcon />
                                                            </div>
                                                            : null
                                                    }
                                            </Column>
                                            <Column xs={4}>
                                                <p>{hook.description}</p>
                                            </Column>
                                        </Row>
                                    })
                                }
                                <Row>
                                    <Column xs={12}>
                                        <span>Use the following key (encoded in UTF8) as the key to verify the signature of Webhook requests. Use the SHA-256 variant of HMAC on
                                            the body of the HTTP request, and check it against the "X-Kwola-Signature" header sent along with those http requests.</span>
                                        <br/>
                                        <br/>
                                        <span>{this.state.application.webhookSignatureSecret}</span>
                                    </Column>
                                </Row>


                            </Papersheet>
                        </Column>
                    </Row>
                    <Row>
                        <Column xs={12} sm={12} md={9} lg={6} xl={4}>
                            <br/>
                            <Papersheet title={`Did you like this interface for setting up your webhooks?`}>
                                <FeedbackWidget
                                    applicationId={this.getApplicationId()}
                                    placeholder={"What could we do better?"}
                                    screen={"Configure Notifications"}
                                    positiveText={"Thumbs up: I liked this webhook screen."}
                                    negativeText={"Thumbs down: This webhook screen could be better."}
                                />
                            </Papersheet>
                        </Column>
                    </Row>
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ConfigureWebhooks} };
export default connect(mapStateToProps)(ConfigureWebhooks);

