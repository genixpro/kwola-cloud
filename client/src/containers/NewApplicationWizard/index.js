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
import NewApplicationWizardStep1 from "./NewApplicationWizardStep1";
import NewApplicationWizardStep2 from "./NewApplicationWizardStep2";
import NewApplicationWizardStep3 from "./NewApplicationWizardStep3";
import NewApplicationWizardStep4 from "./NewApplicationWizardStep4";
import NewApplicationWizardStep5 from "./NewApplicationWizardStep5";
import NewApplicationWizardStep6 from "./NewApplicationWizardStep6";
import "./main.scss";
import stripePromise from "../../stripe";
import {CardElement, ElementsConsumer} from "@stripe/react-stripe-js";
import Promise from "bluebird";
import Snackbar from "../../components/uielements/snackbar";
import SnackAlert from "@material-ui/lab/Alert";

class NewApplicationWizard extends Component {
    state = {
        page: 0,
        application: null,
        runConfiguration: null
    };

    componentDidMount()
    {
        const savedApplicationState = window.localStorage.getItem("NewApplicationWizard-application");
        const savedRunConfigurationState = window.localStorage.getItem("NewApplicationWizard-runConfiguration");

        if (savedApplicationState && savedRunConfigurationState)
        {
            const application = JSON.parse(savedApplicationState);
            const runConfiguration = JSON.parse(savedRunConfigurationState);

            // This is just to handle cases where the user visited the new-app page, but didn't type anything in
            // and later we change the code, say, adding in new variables in the run configuration.
            if (!application.url)
            {
                this.resetWizardState();
            }
            else
            {
                this.setState({
                    application: application,
                    runConfiguration: runConfiguration
                })
            }
        }
        else
        {
            this.resetWizardState();
        }

        if (this.props.match.params.page)
        {
            this.setState({page: Number(this.props.match.params.page) - 1});
        }
    }

    resetWizardState()
    {
        this.setState({
            runConfiguration: {
                email: "",
                password: "",
                maxParallelSessions: 250,
                enableDoubleClickCommand: false,
                enableRightClickCommand: false,
                enableRandomBracketCommand: false,
                enableRandomMathCommand: false,
                enableRandomOtherSymbolCommand: false,
                enableRandomNumberCommand: true,
                enableScrolling: true,
                enableDragging: false,
                enableTypeEmail: true,
                enableTypePassword: true,
                enableRandomLettersCommand: true,
                enableRandomAddressCommand: true,
                enableRandomEmailCommand: true,
                enableRandomPhoneNumberCommand: true,
                enableRandomParagraphCommand: true,
                enableRandomDateTimeCommand: true,
                enableRandomCreditCardCommand: true,
                enableRandomURLCommand: false,
                customTypingActionStrings: [],
                enableChrome: true,
                enableFirefox: true,
                enableEdge: true
            },
            application: {
                name: "",
                url: "",
                package: "monthly",
                launchMethod: "weekly",
                datesOfMonth: {},
                dayOfWeek: 4,
                hourOfDay: 3
            }
        }, () => this.saveWizardState())
    }

    saveWizardState()
    {
        window.localStorage.setItem("NewApplicationWizard-application", JSON.stringify(this.state.application))
        window.localStorage.setItem("NewApplicationWizard-runConfiguration", JSON.stringify(this.state.runConfiguration))
    }

    nextPageClicked()
    {
        let newPage;

        // Skip the 5th page if this is a one off run
        if (this.state.page === 3 && this.state.application.package === "once")
        {
            newPage = this.state.page + 2;
        }
        // Skip the payment details page if the user is allowed free runs
        else if (this.state.page === 2 && Auth.isUserAllowedFreeRuns())
        {
            if (this.state.application.package === "once")
            {
                newPage = this.state.page + 3;
            }
            else
            {
                newPage = this.state.page + 2;
            }
        }
        else
        {
            newPage = this.state.page + 1;
        }
        this.props.history.push(`/app/dashboard/new-application/${newPage + 1}`)
        this.setState({page: newPage});
    }

    previousPageClicked()
    {
        let newPage;

        // Skip the 5th page if this is a one off run
        if (this.state.page === 5 && this.state.application.package === "once")
        {
            if (Auth.isUserAllowedFreeRuns())
            {
                newPage = this.state.page - 3;
            }
            else
            {
                newPage = this.state.page - 2;
            }
        }
        // Skip the payment details page if the user is allowed free runs
        else if (this.state.page === 4 && Auth.isUserAllowedFreeRuns())
        {
            newPage = this.state.page - 2;
        }
        else
        {
            newPage = this.state.page - 1;
        }
        this.props.history.push(`/app/dashboard/new-application/${newPage + 1}`)
        this.setState({page: newPage});
    }

    changeApplicationField(field, newValue)
    {
        const application = this.state.application;
        application[field] = newValue;
        this.setState({application}, () => this.saveWizardState())
    }

    changeRunConfiguration(newValues)
    {
        const runConfig = this.state.runConfiguration;
        Object.keys(newValues).forEach((key) =>
        {
            runConfig[key] = newValues[key];
        });
        this.setState({runConfiguration: runConfig}, () => this.saveWizardState())
    }

    changeRunConfigurationField(field, newValue)
    {
        const runConfig = this.state.runConfiguration;
        runConfig[field] = newValue;
        this.setState({runConfiguration: runConfig}, () => this.saveWizardState())
    }

    finishButtonClicked()
    {
        const applicationObject = {
            ...this.state.application,
            defaultRunConfiguration: this.state.runConfiguration
        }

        return axios.post("/application", applicationObject).then((response) =>
        {
            if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
            {
                window.dataLayer.push({'event': 'created-application'});
            }

            this.resetWizardState();

            if (this.state.application.package === "once")
            {
                this.props.history.push(`/app/dashboard/testing_runs/${response.data.testingRunId}`);
            }
            else if(this.state.application.package === "monthly")
            {
                this.props.history.push(`/app/dashboard/applications/${response.data.applicationId}`);
            }

            return Promise.fulfilled();
        }, (error) =>
        {
            this.setState({
                alertBoxSeverity:"warning",
                alertBox:true,
                alertBoxText:'Internal error while creating your application. Please try again & contact Kwola customer support if the problem persists.'
            });

            return Promise.rejected();
        });
    }

    closeSnackbar()
    {
        this.setState({alertBox: false});
    }

    render()
    {
        const { result } = this.state;

        if (!this.state.application || !this.state.runConfiguration)
        {
            return <LayoutWrapper />;
        }

        return (
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <Column xs={12} sm={12} md={12} lg={10} xl={8}>
                                {
                                    this.state.page === 0 ?
                                        <NewApplicationWizardStep1
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            onApplicationFieldChanged={this.changeApplicationField.bind(this)}
                                            onRunConfigurationFieldChanged={this.changeRunConfigurationField.bind(this)}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                        /> : null
                                }
                                {
                                    this.state.page === 1 ?
                                        <NewApplicationWizardStep2
                                            onPreviousPageClicked={() => this.previousPageClicked()}
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            onChangeRunConfiguration={this.changeRunConfiguration.bind(this)}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                        /> : null
                                }
                                {
                                    this.state.page === 2 ?
                                        <NewApplicationWizardStep3
                                            onPreviousPageClicked={() => this.previousPageClicked()}
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            onApplicationFieldChanged={this.changeApplicationField.bind(this)}
                                            onRunConfigurationFieldChanged={this.changeRunConfigurationField.bind(this)}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                        /> : null
                                }
                                {
                                    this.state.page === 3 ?
                                        <NewApplicationWizardStep4
                                            onPreviousPageClicked={() => this.previousPageClicked()}
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                            onApplicationFieldChanged={this.changeApplicationField.bind(this)}
                                            onRunConfigurationFieldChanged={this.changeRunConfigurationField.bind(this)}
                                        /> : null
                                }
                                {
                                    this.state.page === 4 ?
                                        <NewApplicationWizardStep5
                                            onPreviousPageClicked={() => this.previousPageClicked()}
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                            onApplicationFieldChanged={this.changeApplicationField.bind(this)}
                                            onRunConfigurationFieldChanged={this.changeRunConfigurationField.bind(this)}
                                        /> : null
                                }
                                {
                                    this.state.page === 5 ?
                                        <NewApplicationWizardStep6
                                            onPreviousPageClicked={() => this.previousPageClicked()}
                                            onNextPageClicked={() => this.nextPageClicked()}
                                            application={this.state.application}
                                            runConfiguration={this.state.runConfiguration}
                                            onApplicationFieldChanged={this.changeApplicationField.bind(this)}
                                            onRunConfigurationFieldChanged={this.changeRunConfigurationField.bind(this)}
                                            onFinishButtonClicked={() => this.finishButtonClicked()}

                                        /> : null
                                }
                            </Column>
                        </Row>
                        <Snackbar
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'center',
                            }}
                            onClick={() => this.closeSnackbar()}
                            onClose={() => this.closeSnackbar()}
                            open={this.state.alertBox}
                            autoHideDuration={9000}
                            message={this.state.alertBoxText ?? ""}
                        >
                            <SnackAlert severity={this.state.alertBoxSeverity}>
                                {this.state.alertBoxText ?? ""}
                            </SnackAlert>
                        </Snackbar>
                    </FullColumn>
                </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewApplicationWizard} };
export default connect(mapStateToProps)(NewApplicationWizard);

