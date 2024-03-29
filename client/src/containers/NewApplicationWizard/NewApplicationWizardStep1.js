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
import "./main.scss";
import LoaderButton from "../../components/LoaderButton";
import DoneIcon from "@material-ui/icons/Done";
import Promise from "bluebird";
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import FastForwardIcon from "@material-ui/icons/FastForward";
import {Check} from "@material-ui/icons";
import "devicon/devicon.css"
import "devicon/devicon-colors.css"
import edgeBlackSquare from "../../images/edge-black-square.png";
import edgeWhiteSquare from "../../images/edge-white-square.png";
import DesktopMacIcon from '@material-ui/icons/DesktopMac';
import TabletMacIcon from '@material-ui/icons/TabletMac';
import SmartphoneIcon from '@material-ui/icons/Smartphone';

class NewApplicationWizardStep1 extends Component {
    state = {
        applicationTestImageURL: "",
        showingAutologinVideo: false
    };

    componentDidMount()
    {
        if (this.props.application.url)
        {
            this.updateApplicationImageURL(this.props.application.url);
        }
    }

    updateApplicationImageURL = _.debounce((newURL) =>
    {
        if (newURL)
        {
            let url = `${process.env.REACT_APP_BACKEND_API_URL}application_test_image`;
            url += `?token=${Auth.getQueryParameterToken()}`
            url += `&url=${encodeURIComponent(newURL)}`
            this.setState({applicationTestImageURL: url})
        }
        else
        {
            this.setState({applicationTestImageURL: null})
        }
    }, 500);

    toggleEnableAutologin()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.autologin

        this.setState({autologin: newValue});
        this.changeParentRunConfigurationField("autologin", newValue);
    }

    changeParentApplicationField(field, newValue)
    {
        this.props.onApplicationFieldChanged(field, newValue);
    }

    changeParentRunConfigurationField(field, newValue)
    {
        this.props.onRunConfigurationFieldChanged(field, newValue);
    }

    nameChanged(newValue)
    {
        this.setState({name: newValue});
        this.changeParentApplicationField("name", newValue);
    }

    urlChanged(newValue)
    {
        this.changeParentApplicationField("url", newValue);
        this.changeParentRunConfigurationField("url", newValue);
        this.updateApplicationImageURL(newValue)
    }


    emailChanged(newValue)
    {
        this.changeParentRunConfigurationField("email", newValue);
    }


    passwordChanged(newValue)
    {
        this.changeParentRunConfigurationField("password", newValue);
    }

    nextPageClicked()
    {
        this.validateMaxParallelSessions();
        if (this.props.onNextPageClicked)
        {
            this.props.onNextPageClicked();
        }
    }

    areFieldsValid()
    {
        let urlValid =  /^(ftp|http|https):\/\/[^ "]+$/.test(this.props.application.url);
        return this.props.application.name && urlValid && (this.props.runConfiguration.enableChrome || this.props.runConfiguration.enableFirefox || this.props.runConfiguration.enableEdge);
    }


    maximumParallelSessionsChanged(newValue)
    {
        this.changeParentRunConfigurationField("maxParallelSessions", newValue);
    }


    validateMaxParallelSessions()
    {
        let changedValue = this.props.runConfiguration.maxParallelSessions;
        changedValue = Math.max(changedValue, 10)
        changedValue = Math.min(changedValue, 500)
        this.changeParentRunConfigurationField("maxParallelSessions", changedValue);
    }

    testAutologin()
    {
        this.setState({
            showingAutologinVideo: false,
            autologinVideoURL: null
        });

        const dataObject = {
            "email": this.props.runConfiguration.email,
            "password": this.props.runConfiguration.password,
            "url": this.props.runConfiguration.url
        }

        return axios({
            url: "/test_autologin",
            method: "post",
            data: dataObject,
            responseType: 'blob', // important
        }).then((response) =>
        {
            const url = window.URL.createObjectURL(new Blob([response.data]));

            this.setState({
                showingAutologinVideo: true,
                autologinVideoURL: url
            }, () =>
            {
                const player = new Plyr('#player',{
                    tooltips: {
                        controls: false,
                    },
                    storage:{ enabled: true, key: 'plyr' },
                    //seekTime:this.state.bug.stepNumber,
                });

                player.source = {
                    type: 'video',
                    sources: [
                        {
                            src: url,
                            type: 'video/mp4',
                            //size: 576,
                        },
                    ],

                }

                this.setState({player: player})
            })

            return Promise.fulfilled();
        }, (error) =>
        {
            this.setState({
                alertBoxSeverity:"warning",
                alertBox:true,
                alertBoxText:'Internal error while attempting to verify the automatic login.'
            });

            return Promise.rejected();
        });
    }

    toggleEnableChrome()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableChrome;
        this.changeParentRunConfigurationField("enableChrome", newValue);
    }

    toggleEnableFirefox()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableFirefox;
        this.changeParentRunConfigurationField("enableFirefox", newValue);
    }

    toggleEnableEdge()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableEdge;
        this.changeParentRunConfigurationField("enableEdge", newValue);
    }

    toggleEnableWindowSizeDesktop()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableWindowSizeDesktop;
        this.changeParentRunConfigurationField("enableWindowSizeDesktop", newValue);
    }

    toggleEnableWindowSizeTablet()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableWindowSizeTablet;
        this.changeParentRunConfigurationField("enableWindowSizeTablet", newValue);
    }

    toggleEnableWindowSizeMobile()
    {
        if (this.props.disabled)
        {
            return;
        }

        const newValue = !this.props.runConfiguration.enableWindowSizeMobile;
        this.changeParentRunConfigurationField("enableWindowSizeMobile", newValue);
    }

    render()
    {
        const { result } = this.state;

        return (
            <Papersheet title={`New Application`} subtitle={`Step 1 of 6`}>
                <Row>
                    <Column xs={6}>
                        <TextField
                            id={"application-name"}
                            label={"Name"}
                            value={this.props.application.name}
                            onChange={(evt) => this.nameChanged(evt.target.value)}
                            margin="dense"
                            style={{"width": "100%"}}
                        />
                        <span style={{"fontSize": "12px", "color": "grey", "fontStyle": "italic"}}>Name for your application within Kwola. Can be anything you want.</span>

                        <br/>

                        <TextField
                            id={"application-url"}
                            label={"Login Page URL"}
                            value={this.props.application.url}
                            onChange={(evt) => this.urlChanged(evt.target.value)}
                            margin="normal"
                            style={{"width": "100%"}}
                        />
                        <span style={{"fontSize": "12px", "color": "grey", "fontStyle": "italic"}}>The page within your web application that Kwola will start on. Start with https://. If you have a firewall, open traffic from IP 35.224.203.231</span>
                        <br/>
                        <br/>
                        <label style={{"fontSize": "12px", "color": "grey", "fontFamily": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif"}}>Web Browsers</label>
                        <div>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableChrome ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable Chrome?"}
                                    onClick={() => this.toggleEnableChrome()}
                            >
                                <i className="devicon-chrome-plain" />
                                {
                                    this.props.runConfiguration.enableChrome ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableFirefox ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable Firefox?"}
                                    onClick={() => this.toggleEnableFirefox()}
                            >
                                <i className="devicon-firefox-plain" />
                                {
                                    this.props.runConfiguration.enableFirefox ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableEdge ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable Microsoft Edge?"}
                                    onClick={() => this.toggleEnableEdge()}
                            >
                                {
                                    !this.props.runConfiguration.enableEdge ?
                                        <img src={edgeBlackSquare}
                                             style={{"width": "26px"}}/>
                                        : null
                                }
                                {
                                    this.props.runConfiguration.enableEdge ?
                                        <img src={edgeWhiteSquare}
                                             style={{"width": "26px"}}/>
                                        : null
                                }

                                {
                                    this.props.runConfiguration.enableEdge ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                        </div>
                        <span style={{"fontSize": "12px", "color": "grey", "fontStyle": "italic"}}>Select which web browsers you want to test with. Safari support coming soon.</span>
                        <br/>
                        <br/>
                        <label style={{"fontSize": "12px", "color": "grey", "fontFamily": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif"}}>Window Sizes</label>
                        <div>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableWindowSizeDesktop ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable desktop window sizes?"}
                                    onClick={() => this.toggleEnableWindowSizeDesktop()}
                            >
                                <DesktopMacIcon/>
                                {
                                    this.props.runConfiguration.enableWindowSizeDesktop ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableWindowSizeTablet ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable tablet window sizes?"}
                                    onClick={() => this.toggleEnableWindowSizeTablet()}
                            >
                                <TabletMacIcon />
                                {
                                    this.props.runConfiguration.enableWindowSizeTablet ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                            <Button variant="contained"
                                    size="medium"
                                    color={this.props.runConfiguration.enableWindowSizeMobile ? "primary" : "default"}
                                    className={"browser-selection-button"}
                                    title={"Enable mobile window sizes?"}
                                    onClick={() => this.toggleEnableWindowSizeMobile()}
                            >
                                <SmartphoneIcon />
                                {
                                    this.props.runConfiguration.enableWindowSizeMobile ? <span className={"check-span"}>&nbsp;&nbsp;<Check /></span> : null
                                }
                            </Button>
                        </div>
                        <span style={{"fontSize": "12px", "color": "grey", "fontStyle": "italic"}}>Select which window sizes you want to test with? This allows you to test the mobile and tablet versions of your website.</span>
                        <br/>
                        <br/>
                        <TextField
                            id={"application-maximum-parallel-sessions"}
                            label={"Maximum Parallel Web Browser Sessions"}
                            value={this.props.runConfiguration.maxParallelSessions}
                            type={"number"}
                            onChange={(evt) => this.maximumParallelSessionsChanged(evt.target.value)}
                            onBlur={(evt) => this.validateMaxParallelSessions()}
                            onKeyDown={(evt) => {if (evt.keyCode === 13) {this.validateMaxParallelSessions()}}}
                            margin="normal"
                            style={{"width": "100%"}}
                        />
                        <span style={{"fontSize": "12px", "color": "grey", "fontStyle": "italic"}}>The maximum number of web browsers to run at the same time interacting with your application. Lower this number if your environment has limited resources.</span>
                        <br/>
                        <br/>
                        <FormGroup row>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={this.props.runConfiguration.autologin}
                                        onChange={() => this.toggleEnableAutologin()}
                                        value="autologin"
                                        style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                    />
                                }
                                label="Enable Automatic Login?"
                                style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            />
                        </FormGroup>
                        <br/>
                        {
                            this.props.runConfiguration.autologin ?
                                <TextField
                                    id="email"
                                    label="Email / Username"
                                    type={"text"}
                                    value={this.props.runConfiguration.email}
                                    onChange={(event) => this.emailChanged(event.target.value)}
                                    margin="normal"
                                    style={{"width": "100%"}}
                                /> : null
                        }
                        <br/>
                        {
                            this.props.runConfiguration.autologin ?
                                <TextField
                                    id="password"
                                    label="Password"
                                    type={"password"}
                                    value={this.props.runConfiguration.password}
                                    onChange={(event) => this.passwordChanged(event.target.value)}
                                    margin="normal"
                                    style={{"width": "100%"}}
                                /> : null
                        }

                    </Column>
                    <Column xs={6}>
                        {
                            this.state.applicationTestImageURL && !(this.props.runConfiguration.autologin && this.state.showingAutologinVideo) ?
                                <SingleCard src={this.state.applicationTestImageURL} grid className={"screenshot-area"}/>
                                : null
                        }
                        {
                            !this.state.applicationTestImageURL && !(this.props.runConfiguration.autologin && this.state.showingAutologinVideo) ?
                                <div className={"screenshot-blank-area"}>

                                </div>
                                : null
                        }
                        {
                            this.props.runConfiguration.autologin && this.state.showingAutologinVideo ?
                                <Papersheet>
                                    <video id="player" controls style={{"width": "100%"}}>
                                        <source  type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                </Papersheet>

                                : null
                        }

                        {
                            this.props.runConfiguration.autologin ?
                                <LoaderButton onClick={() => this.testAutologin()} className={"test-login-button"}>
                                    <span>Test Automatic Login</span>
                                </LoaderButton> : null
                        }

                        {
                            this.props.runConfiguration.autologin && this.state.showingAutologinVideo ? <div className={"autologin-info-text"}>
                                <span>Please review the above video footage to see if Kwola was able to log into
                                your system successfully. If there are any problems, please contact Kwola
                                customer support at support@kwola.io</span>
                            </div> : null
                        }

                    </Column>
                </Row>

                <Row>
                    <div className={"wizard-navigation-buttons"}>
                        <Button variant="contained"
                                size="medium"
                                color={"secondary"}
                                className={"wizard-button"}
                                title={"Previous Step"}
                                disabled={true}
                        >
                            <span><NavigateBeforeIcon style={{"position": "relative", "top": "6px"}} /> Previous&nbsp;&nbsp;&nbsp;</span>
                        </Button>
                        <Button variant="contained"
                                size="medium"
                                color={"primary"}
                                className={"wizard-button"}
                                title={"Next Step"}
                                disabled={!this.areFieldsValid()}
                                onClick={(event) => this.nextPageClicked(event)}>
                            <span>&nbsp;&nbsp;&nbsp;Next <NavigateNextIcon style={{"position": "relative", "top": "6px"}} /></span>
                        </Button>
                    </div>
                </Row>
            </Papersheet>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.NewApplicationWizardStep1} };
export default connect(mapStateToProps)(NewApplicationWizardStep1);

