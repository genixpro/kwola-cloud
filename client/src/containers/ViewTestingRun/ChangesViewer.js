import React, { Component } from 'react';
//import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import {connect, Provider} from 'react-redux';
import MaterialTable from 'material-table'
import Icon from "../../components/uielements/icon";
import Button from "../../components/uielements/button";
import axios from "axios";
import Promise from "bluebird";
import Auth from "../../helpers/auth0";
import "./ChangesViewer.scss"
import {FullColumn, HalfColumn, OneThirdColumn, Column, Row, TwoThirdColumn} from "../../components/utility/rowColumn";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowForward from "@material-ui/icons/ArrowForward";
import FastForwardIcon from '@material-ui/icons/FastForward';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import FastRewindIcon from '@material-ui/icons/FastRewind';
import CircularProgress from "../../components/uielements/circularProgress";

class ChangesViewer extends Component{
    state = {
        currentSessionNumber: 0,
        currentTraceNumber: 0,
        loaded: false,
        executionSessions: [],
        differences: [],
        hilightedChange: null,
        selectedChange: null,
        loadingDifferences: true
    };

    constructor(props)
    {
        super(props);

        this.cachedDifferencePromises = {};
    }

    componentDidMount()
    {
        this.loadExecutionSessions();
    }

    loadExecutionSessions()
    {
        axios.get(`/execution_sessions`, {
            params: {
                "testingRunId": this.props.testingRun.id,
                "isChangeDetectionSession": true
            }
        }).then((response) => {
            this.setState({
                executionSessions: response.data.executionSessions,
                loaded: true
            });
        });
    }


    fetchDifferences()
    {
        const session = this.state.executionSessions[this.state.currentSessionNumber];
        const traceId = session.executionTraces[this.state.currentTraceNumber];

        this.setState({differences: [], loadingDifferences: true});

        if (!this.cachedDifferencePromises[traceId])
        {
            this.cachedDifferencePromises[traceId] = axios.get(`/behavioural_differences`, {
                params: {
                    "newExecutionTraceId": traceId
                }
            });
        }

        const promise = this.cachedDifferencePromises[traceId];
        promise.then((response) => {
            this.setState({
                differences: response.data.differences,
                loadingDifferences: false
            });
        }, (errorResponse) =>
        {
            this.setState({
                differences: [],
                loadingDifferences: false
            });
        });
    }

    onDifferenceMouseEnter(difference)
    {
        this.setState({hilightedChange: difference})
    }

    onDifferenceMouseLeave(difference)
    {
        // if (rowData === this.state.hilightedChange)
        // {
        this.setState({hilightedChange: null})
        // }
    }

    onDifferenceClick(difference)
    {
        if (this.state.selectedChange === null || difference._id !== this.state.selectedChange._id)
        {
            this.setState({selectedChange: difference})
        }
        else
        {
            this.setState({selectedChange: null})
        }
    }

    backwardOneFrame()
    {
        if (this.state.currentTraceNumber > 0)
        {

            this.setState({currentTraceNumber: this.state.currentTraceNumber - 1}, () => this.updateVideoPlaybackPosition());
        }
    }

    forwardOneFrame()
    {
        if (this.state.currentTraceNumber < (this.state.executionSessions[this.state.currentSessionNumber].executionTraces.length - 1))
        {
            this.setState({currentTraceNumber: this.state.currentTraceNumber + 1}, () => this.updateVideoPlaybackPosition());
        }
    }

    forwardToNextDifference()
    {
        let sessionNumber = this.state.currentSessionNumber;
        let traceNumber = this.state.currentTraceNumber;

        let currentTraceId = null;

        let zeroResets = 0;

        do
        {
            if (traceNumber === (this.state.executionSessions[sessionNumber].executionTraces.length - 1))
            {
                traceNumber = 0;
                if (sessionNumber === (this.state.executionSessions.length - 1))
                {
                    sessionNumber = 0;
                    zeroResets += 1;
                }
                else
                {
                    sessionNumber += 1;
                }
            }
            else
            {
                traceNumber += 1;
            }

            // Just to prevent an infinite loop in case there are no changes
            if (zeroResets >= 2)
            {
                break;
            }

            currentTraceId = this.state.executionSessions[sessionNumber].executionTraces[traceNumber]._id;

        } while (this.state.executionSessions[sessionNumber].executionTracesWithChanges.indexOf(currentTraceId) === -1)

        this.setState({
            currentSessionNumber: sessionNumber,
            currentTraceNumber: traceNumber
        }, () => this.updateVideoPlaybackPosition());
    }

    backwardToLastDifference()
    {
        let sessionNumber = this.state.currentSessionNumber;
        let traceNumber = this.state.currentTraceNumber;

        let currentTraceId = null;

        let zeroResets = 0;

        do
        {
            if (traceNumber === 0)
            {
                traceNumber = this.state.executionSessions[sessionNumber].executionTraces.length - 1;
                if (sessionNumber === 0)
                {
                    sessionNumber = (this.state.executionSessions.length - 1);
                    zeroResets += 1;
                }
                else
                {
                    sessionNumber -= 1;
                }
            }
            else
            {
                traceNumber -= 1;
            }

            // Just to prevent an infinite loop in case there are no changes
            if (zeroResets >= 2)
            {
                break;
            }

            currentTraceId = this.state.executionSessions[sessionNumber].executionTraces[traceNumber]._id;

        } while (this.state.executionSessions[sessionNumber].executionTracesWithChanges.indexOf(currentTraceId) === -1)

        this.setState({
            currentSessionNumber: sessionNumber,
            currentTraceNumber: traceNumber
        }, () => this.updateVideoPlaybackPosition());
    }

    moveToPreviousSession()
    {
        if (this.state.currentSessionNumber > 0)
        {
            this.setState({
                currentSessionNumber: this.state.currentSessionNumber - 1,
                currentTraceNumber: 0
            }, () => this.updateVideoPlaybackPosition());
        }
    }

    moveToNextSession()
    {
        if (this.state.currentSessionNumber < (this.state.executionSessions.length - 1))
        {
            this.setState({
                currentSessionNumber: this.state.currentSessionNumber + 1,
                currentTraceNumber: 0
            }, () => this.updateVideoPlaybackPosition());
        }
    }


    getDescriptionForDifference(difference)
    {
        if (difference.differenceType === "changed_text")
        {
            return `Text "${difference.priorText}" changed to "${difference.newText}"`
        }

        if (difference.differenceType === "deleted_text")
        {
            return `Deleted text "${difference.priorText}"`
        }

        if (difference.differenceType === "added_text")
        {
            return `Added text "${difference.newText}"`
        }

        return "Unknown";
    }

    updateVideoPlaybackPosition()
    {
        const priorVideoElement = document.getElementById("prior-execution-session-video");
        const newVideoElement = document.getElementById("new-execution-session-video");

        priorVideoElement.currentTime = this.state.currentTraceNumber;
        newVideoElement.currentTime = this.state.currentTraceNumber;
    }

    render()
    {
        if (!this.state.loaded)
        {
            return null;
        }

        if (this.state.executionSessions.length === 0)
        {
            return <FullColumn>
                <p>Did not find any executions sessions for change detection.</p>
            </FullColumn>;
        }

        return(
            <FullColumn>
                <Row>
                    <Column xs={4}>
                        <Row className={""}>
                            {/*<h4>Last Testing Run</h4>*/}
                            <div className={"differences-screenshot-wrapper"}>
                                {
                                    this.state.differences.map((difference, differenceIndex) =>
                                    {
                                        if (this.state.selectedChange !== null)
                                        {
                                            if (difference._id === this.state.selectedChange._id)
                                            {
                                                return;
                                            }
                                        }

                                        const styleAttributes = {
                                            "left": `${difference.priorLeft * 100}%`,
                                            "top": `${difference.priorTop * 100}%`,
                                            "bottom": `${difference.priorBottom * 100}%`,
                                            "right": `${difference.priorRight * 100}%`
                                        }

                                        if (this.state.hilightedChange !== null)
                                        {
                                            if (difference._id === this.state.hilightedChange._id)
                                            {
                                                styleAttributes["opacity"] = "0.3"
                                            }
                                            else
                                            {
                                                styleAttributes["opacity"] = "0.1"
                                            }
                                        }

                                        return <div key={differenceIndex}
                                                    className={`difference-box ${difference.differenceType}`}
                                                    style={styleAttributes}
                                                    onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                    onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                        >

                                        </div>
                                    })
                                }

                                <video style={{"width": "100%"}} className="differences-video">
                                    <source src={`${process.env.REACT_APP_BACKEND_API_URL}execution_sessions/${this.state.executionSessions[this.state.currentSessionNumber].changeDetectionPriorExecutionSessionId}/video?token=${Auth.getQueryParameterToken()}`}
                                            type="video/mp4"
                                            id={"prior-execution-session-video"}
                                    />
                                    <span>Your browser does not support the video tag.</span>
                                </video>
                            </div>
                        </Row>
                        <Row>
                            <div className={"difference-viewer-control-buttons-wrapper"}>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Backward to the last session"}
                                        onClick={() => this.moveToPreviousSession()}>
                                    <SkipPreviousIcon />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Backward to last frame"}
                                        onClick={() => this.backwardToLastDifference()}>
                                    <FastRewindIcon />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Backward to last frame"}
                                        onClick={() => this.backwardOneFrame()}>
                                    <ArrowBackIcon />
                                </Button>

                                <div className={"difference-viewer-frame-indicator"}>
                                    Frame 1 / 10<br/>
                                    Session 2 / {this.state.executionSessions.length}
                                </div>

                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Forward to next frame"}
                                        onClick={() => this.forwardOneFrame()}>
                                    <ArrowForward />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Forward to next frame with changes"}
                                        onClick={() => this.forwardToNextDifference()}>
                                    <FastForwardIcon />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Forward to next session"}
                                        onClick={() => this.moveToNextSession()}>
                                    <SkipNextIcon />
                                </Button>
                            </div>
                        </Row>
                        <Row>
                            {/*<h4>This Testing Run</h4>*/}
                            <div className={"differences-screenshot-wrapper"}>
                                {/*<img src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.props.testingRun.applicationId}/image?token=${Auth.getQueryParameterToken()}`} className="differences-screenshot" />*/}

                                {
                                    this.state.differences.map((difference, differenceIndex) =>
                                    {
                                        if (this.state.selectedChange !== null)
                                        {
                                            if (difference._id === this.state.selectedChange._id)
                                            {
                                                return;
                                            }
                                        }

                                        const styleAttributes = {
                                            "left": `${difference.newLeft * 100}%`,
                                            "top": `${difference.newTop * 100}%`,
                                            "bottom": `${difference.newBottom * 100}%`,
                                            "right": `${difference.newRight * 100}%`
                                        }

                                        if (this.state.hilightedChange !== null)
                                        {
                                            if (difference._id === this.state.hilightedChange._id)
                                            {
                                                styleAttributes["opacity"] = "0.3"
                                            }
                                            else
                                            {
                                                styleAttributes["opacity"] = "0.1"
                                            }
                                        }

                                        return <div key={differenceIndex}
                                                    className={`difference-box ${difference.differenceType}`}
                                                    style={styleAttributes}
                                                    onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                    onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                        >

                                        </div>
                                    })
                                }

                                <video style={{"width": "100%"}} className="differences-video">
                                    <source src={`${process.env.REACT_APP_BACKEND_API_URL}execution_sessions/${this.state.executionSessions[this.state.currentSessionNumber]._id}/video?token=${Auth.getQueryParameterToken()}`}
                                            type="video/mp4"
                                            id={"new-execution-session-video"} />
                                    <span>Your browser does not support the video tag.</span>
                                </video>
                            </div>
                        </Row>
                    </Column>
                    <Column xs={8}>
                        {
                            this.state.loadingDifferences ?
                                <CircularProgress size={24} style={{"color": "blue"}}/> : null
                        }
                        {
                            !this.state.loadingDifferences ?
                                <Row>
                                    <MaterialTable
                                        columns={[
                                            {title: 'id', field: '_id', hidden: true},
                                            {
                                                title: 'Change',
                                                field: 'description',
                                                render: (difference) => {
                                                    let classes = "difference-row";

                                                    if (this.state.selectedChange !== null) {
                                                        if (difference._id === this.state.selectedChange._id) {
                                                            classes += " selected"
                                                        }
                                                    }

                                                    return <div
                                                        className={classes}
                                                        onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                        onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                                    >
                                                        {this.getDescriptionForDifference(difference)}
                                                    </div>;
                                                }
                                            }
                                        ]}
                                        data={this.state.differences}
                                        title=""
                                        onRowClick={this.handleRowClick.bind(this)}
                                        style={{"width": "100%", "marginLeft": "10px"}}
                                        options={{
                                            search: false,
                                            pageSize: 10,
                                            pageSizeOptions: [5, 10, 20, 50],
                                            toolbar: false,
                                            rowStyle: {
                                                fontSize: "14px"
                                            }
                                        }}
                                    />
                                </Row> : null
                        }
                    </Column>
                </Row>
            </FullColumn>
        )
    }
}
const mapStateToProps = (state) => {return { ...state.ChangesViewer} };
export default connect(mapStateToProps)(ChangesViewer);
