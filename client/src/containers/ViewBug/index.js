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


class ViewBug extends Component {
    state = {
        result: '',
        loadingVideo:true,
        loader:false,
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
        document.getElementById('downloadLink').click();
    }

    loadVideo(player){

        this.setState({loader:true}, ()=>{
            axios({
              url:`${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.state.bug._id}/video?token=${Auth.getQueryParameterToken()}`,
              method: 'GET',
              responseType: 'blob', // important
            }).then((response) => {

              const url = window.URL.createObjectURL(new Blob([response.data]));
              this.makePlayer(url,player)
              const link = document.createElement('a');
              link.id = "downloadLink"
              link.href = url;
              link.setAttribute('download', this.state.bug._id+'_debug.mp4');
              document.body.appendChild(link);
              //link.click();
            
              this.setState({loader:false});
            });
        });
        return false;
    }

    seekVideo(){
        if(!this.state.player) return false;
        this.state.player.restart()
        this.state.player.forward(this.state.bug.stepNumber)
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

                                    <video id="player" controls style={{"width": "100%"}}>
                                        <source  type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                    <br />
                                    <Button variant="contained"
                                            color={"primary"}
                                            className="orderBtn"
                                            title={"Show Bug"}
                                            onClick={() => this.seekVideo()}>
                                        <span>Skip to bug frame in video</span>
                                        <FastForwardIcon />
                                    </Button>
                                </Papersheet>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Bug ${this.state.bug._id}`}
                                    // subtitle={}
                                >
                                    <span>Bug Type: {this.state.bug.error._cls || "Unknown"}</span><br/><br/>
                                    <span>Log Level: {this.state.bug.error.logLevel || "Unknown"}</span><br/><br/>
                                    <span>Message:</span><br/>
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.message}</pre>

                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.stacktrace}</pre>
                                </Papersheet>
                                <br/>
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

