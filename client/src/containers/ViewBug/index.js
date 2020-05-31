import React, { Component } from 'react';
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

class ViewBug extends Component {
    state = {
        result: '',
    };

    componentDidMount()
    {
        axios.get(`/bugs/${this.props.match.params.id}`).then((response) =>
        {
            this.setState({bug: response.data.bug})
        });
    }

    downloadVideo(){
        this.setState({loader:true}, ()=>{
            axios({
              url:`${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.state.bug._id}/video?token=${Auth.getQueryParameterToken()}`,
              method: 'GET',
              responseType: 'blob', // important
            }).then((response) => {

              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', this.state.bug._id+'_debug.mp4');
              document.body.appendChild(link);
              link.click();
              this.setState({loader:false});
            });
        });
        return false;
    }

    render() {
        const { result } = this.state;
        const downloadVideo = <IconButton onClick={() =>this.downloadVideo()} aria-label="get_app" color="secondary">{this.state.loader ? <CircularProgress disabled size={18} color="secondary"/> : <Icon className="fontSizeSmall">get_app</Icon>}</IconButton>       
        return (
            this.state.bug ?
                <LayoutWrapper>
                    <FullColumn>
                        <Row>
                            <HalfColumn>
                                <Papersheet title="Debug Video" tooltip={downloadVideo}>

                                    <video controls style={{"width": "100%"}}>
                                        <source src={`${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.state.bug._id}/video?token=${Auth.getQueryParameterToken()}`} type="video/mp4" />
                                        <span>Your browser does not support the video tag.</span>
                                    </video>
                                </Papersheet>
                            </HalfColumn>

                            <HalfColumn>
                                <Papersheet
                                    title={`Bug ${this.state.bug._id}`}
                                    // subtitle={}
                                >
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.message}</pre>
                                    <pre style={{"whiteSpace":"pre-wrap"}}>{this.state.bug.error.stacktrace}</pre>
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

