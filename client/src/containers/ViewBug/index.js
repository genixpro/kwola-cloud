import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import PageTitle from '../../components/utility/paperTitle';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import Auth from "../../helpers/auth0/index"
import Button, {IconButton} from "../../components/uielements/button"; 
import Icon from "../../components/uielements/icon"; 
import CircularProgress from '../../components/uielements/circularProgress';
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import FeedbackWidget from "../FeedbackWidget";
import FastForwardIcon from '@material-ui/icons/FastForward';
import BugActionList from "./BugActionList";
import {Check} from "@material-ui/icons";
import edgeBlackSquare from "../../images/edge-black-square.png";
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ArrowForward from '@material-ui/icons/ArrowForward';
import "./index.scss";
import LoaderButton from "../../components/LoaderButton";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import {detect} from "detect-browser";


class ViewBug extends Component {
    state = {
        result: '',
        loadingVideo:true,
        loader:false,
        executionSession: null,
        spriteSheetImageURL: null,
        isAdmin: Auth.isAdmin()
    };

    componentDidMount()
    {
        axios.get(`/bugs/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({bug: response.data.bug})
            
            const player = new Plyr('#player',{
                tooltips: {
                    controls: false,
                },
                storage:{ enabled: true, key: 'plyr' },
                //seekTime:this.state.bug.stepNumber,
            });
            this.loadVideo(player)

            // axios.get(`/execution_sessions/${response.data.bug.executionSessionId}`).then((response) =>
            // {
            //     this.setState({executionSession: response.data.executionSession})
            // });
        });
        
    }
     makePlayer(url,player){
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
       
        this.setState({player:player})
     }
     
    downloadVideo(){
        document.getElementById(`downloadLink-${this.state.bug._id}`).click();
    }

    loadVideo(player)
    {
        this.setState({loader:true}, ()=>{
            axios({
              url:`${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.state.bug._id}/video?token=${Auth.getQueryParameterToken()}`,
              method: 'GET',
              responseType: 'blob', // important
            }).then((response) => {

              const url = window.URL.createObjectURL(new Blob([response.data]));
              this.makePlayer(url,player)
              const link = document.createElement('a');
              link.id = `downloadLink-${this.state.bug._id}`
              link.href = url;
              link.setAttribute('download', this.state.bug._id+'_debug.mp4');
              document.body.appendChild(link);
              //link.click();
            
              this.setState({loader:false});
            });
        });
        return false;
    }

    changeBugImportanceLevel(newImportanceLevel)
    {
        const bug = this.state.bug;
        bug.importanceLevel = newImportanceLevel;
        this.setState({bug});

        axios.post(`/bugs/${this.state.bug._id}`, {importanceLevel: newImportanceLevel}).then((response) => {

        }, (error) =>
        {
            console.error("Error occurred while muting bug!");
        });
    }

    changeBugStatus(newStatus)
    {
        const bug = this.state.bug;
        bug.status = newStatus;
        this.setState({bug});

        axios.post(`/bugs/${this.state.bug._id}`, {status: newStatus}).then((response) => {

        }, (error) =>
        {
            console.error("Error occurred while muting bug!");
        });
    }

    seekToAction(actionNumber)
    {
        if(!this.state.player) return false;
        this.state.player.restart()

        const browser = detect();
        if (browser.name === "firefox")
        {
            this.state.player.forward(actionNumber)
        }
        else
        {
            this.state.player.forward(actionNumber + 0.5)
        }
    }

    goToActionClicked(index)
    {
        document.getElementById("video-top").scrollIntoView();

        this.seekToAction(index);
    }

    forwardOneFrame()
    {
        if(!this.state.player) return false;
        this.state.player.forward(1)
    }

    backwardOneFrame()
    {
        if(!this.state.player) return false;

        this.state.player.rewind(1)
    }

    triggerBugReproductionJob()
    {
        return axios.post(`/bugs/${this.state.bug._id}/start_reproduction_job`, {}).then((response) =>
        {

        }, (error) =>
        {
            console.error("Error occurred while triggering the bug reproduction job.");
        });
    }

    render() {
        const { result } = this.state;
        const downloadVideo = <IconButton disabled={this.state.loader} onClick={() =>this.downloadVideo()} aria-label="get_app" color="secondary">{this.state.loader ? <CircularProgress disabled size={18} color="secondary"/> : <Icon className="fontSizeSmall">get_app</Icon>}</IconButton>       
    

        return (
            this.state.bug ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <Papersheet title="Debug Video" tooltip={downloadVideo}>
                                    <div id={"video-top"} />
                                    <video id="player" controls style={{"width": "100%"}}>
                                        <source  type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                    <br />
                                    <Button variant="contained"
                                            color={"primary"}
                                            className="video-control-button"
                                            title={"Backward One Frame"}
                                            onClick={() => this.backwardOneFrame()}>
                                        <ArrowBackIcon />
                                    </Button>
                                    <Button variant="contained"
                                            color={"primary"}
                                            className="video-control-button"
                                            title={"Show Bug"}
                                            onClick={() => this.seekToAction(this.state.bug.stepNumber)}>
                                        <span>Skip to bug frame in video</span>
                                    </Button>
                                    <Button variant="contained"
                                            color={"primary"}
                                            className="video-control-button"
                                            title={"Forward One Frame"}
                                            onClick={() => this.forwardOneFrame()}>
                                        <ArrowForward />
                                    </Button>
                                </Papersheet>
                                <br/>
                                <img src={this.state.spriteSheetImageURL} />
                                <Papersheet title={"Actions Performed"}>
                                    <div className={"reproducible-widget"}>
                                        {
                                            this.state.bug.reproducible ?
                                                <div className={"successful-reproduction"}>
                                                    <CheckCircleIcon htmlColor={"green"}/>
                                                    <span>Reproducible</span>
                                                </div> : null
                                        }
                                        {
                                            !this.state.bug.reproducible ?
                                                <div className={"failed-reproduction"}>
                                                    <CancelIcon htmlColor={"red"}/>
                                                    <span>Failed to reproduce </span>
                                                </div> : null
                                        }
                                    </div>
                                    <br/>
                                    <BugActionList bug={this.state.bug} onGoToActionClicked={(index) => this.goToActionClicked(index)} />
                                </Papersheet>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Bug ${this.state.bug._id}`}
                                    // subtitle={}
                                >
                                    <span>Bug Type: {this.state.bug.error._cls || "Unknown"}</span><br/><br/>
                                    <span>Page: {this.state.bug.error.page || "Unknown"}</span><br/><br/>
                                    {
                                        this.state.bug.error._cls === "LogError" ?
                                            <span>Log Level: {this.state.bug.error.logLevel || "N/A"}<br/><br/></span>
                                            : null
                                    }
                                    {
                                        this.state.bug.error._cls === "HttpError" ?
                                            <span>HTTP Status Code: {this.state.bug.error.statusCode || "N/A"}<br/><br/></span>
                                            : null
                                    }
                                    {
                                        this.state.bug.error._cls === "HttpError" ?
                                            <span>HTTP Request URL: {this.state.bug.error.url || "N/A"}<br/><br/></span>
                                            : null
                                    }
                                    {
                                        this.state.bug.browser === "chrome" ?
                                            <span>Browser: <i className="devicon-chrome-plain" style={{"fontSize":"20px", "position": "relative", "top": "2px"}} /> Chrome<br/><br/></span> : null
                                    }
                                    {
                                        this.state.bug.browser === "firefox" ?
                                            <span>Browser: <i className="devicon-firefox-plain" style={{"fontSize":"20px", "position": "relative", "top": "2px"}} /> Firefox<br/><br/></span> : null
                                    }
                                    {
                                        this.state.bug.browser === "edge" ?
                                            <span>Browser: <img src={edgeBlackSquare}  style={{"width":"20px", "position": "relative", "top": "3px"}} /> Edge<br/><br/></span> : null
                                    }
                                    {
                                        this.state.bug.userAgent ?
                                            <span>User Agent: {this.state.bug.userAgent}<br/><br/></span> : null
                                    }
                                    {
                                        this.state.bug.windowSize ?
                                            <span>Window Size: {this.state.bug.windowSize}<br/><br/></span> : null
                                    }

                                    <span>Importance Level:
                                    <select value={this.state.bug.importanceLevel}
                                            onChange={(evt) => this.changeBugImportanceLevel(evt.target.value)}
                                    >
                                          <option value={1}>1 (highest)</option>
                                          <option value={2}>2</option>
                                          <option value={3}>3</option>
                                          <option value={4}>4</option>
                                          <option value={5}>5 (lowest)</option>
                                      </select>
                                        <br/><br/>
                                    </span>

                                    <span>Status:
                                        <select value={this.state.bug.status}
                                                onChange={(evt) => this.changeBugStatus(evt.target.value)}>
                                              <option value={'new'}>New</option>
                                              <option value={'triage'}>In triage</option>
                                              <option value={'fix_in_progress'}>Fix in progress</option>
                                              <option value={'needs_testing'}>Fixed, needs testing</option>
                                              <option value={'closed'}>Closed</option>
                                          </select>
                                        <br/><br/>
                                    </span>

                                    <span>Message:</span><br/>
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.message || "N/A"}</pre>

                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.stacktrace}</pre>
                                </Papersheet>
                                <br/>

                                {
                                    this.state.isAdmin && process.env.REACT_APP_DISABLE_ADMIN_VIEW !== "true" ?
                                        [
                                            <Papersheet title={`Admin`} key={1}>
                                                <LoaderButton onClick={() => this.triggerBugReproductionJob()}>
                                                    Trigger Bug Reproduction Job
                                                    <Icon className="rightIcon">send</Icon>
                                                </LoaderButton>
                                            </Papersheet>,
                                            <br key={2}/>
                                        ]
                                        : null
                                }


                                <Papersheet title={`Did you like the information you got about this bug?`}>
                                    <FeedbackWidget
                                        applicationId={this.props.match.params.id}
                                        positivePlaceholder={"What did you like about it?"}
                                        negativePlaceholder={"What would you like to see on this page?"}
                                        screen={"View Bug"}
                                        positiveText={"Thumbs up: I got what I needed from this page."}
                                        negativeText={"Thumbs down: This didn't help me. I need more."}
                                    />
                                </Papersheet>
                            </HalfColumn>
                        </Row>
                    </FullColumn>
                </LayoutWrapper>
                : null

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewBug} };
export default connect(mapStateToProps)(ViewBug);

