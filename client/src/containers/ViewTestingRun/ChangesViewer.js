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
import RepeatIcon from '@material-ui/icons/Repeat';
import CircularProgress from "../../components/uielements/circularProgress";
import _ from "underscore";

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
                "testingRunId": this.props.testingRun._id,
                "isChangeDetectionSession": true
            }
        }).then((response) => {
            let stateUpdateCallback = this.updatePageWithNewTrace.bind(this);

            if (response.data.executionSessions.length > 0)
            {
                const firstSession = response.data.executionSessions[0];
                if (firstSession.executionTracesWithChanges.indexOf(firstSession.executionTraces[0]) === -1)
                {
                    stateUpdateCallback = this.forwardToNextDifference.bind(this);
                }
            }

            this.setState({
                executionSessions: response.data.executionSessions,
                loaded: true
            }, () => stateUpdateCallback());
        });
    }


    fetchDifferences()
    {
        if (!this.state.executionSessions.length)
        {
            return;
        }

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
            const differences = response.data.behaviouralDifferences;
            const differencesSorted = _.sortBy(differences, (diff) => _.isUndefined(diff.isDuplicate) ? false : diff.isDuplicate)
            console.log(differencesSorted);

            this.setState({
                differences: differencesSorted,
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

    updatePageWithNewTrace()
    {
        this.updateVideoPlaybackPosition();
        this.fetchDifferences();
    }

    backwardOneFrame()
    {
        if (this.state.currentTraceNumber > 0)
        {
            this.setState({currentTraceNumber: this.state.currentTraceNumber - 1}, () => this.updatePageWithNewTrace());
        }
    }

    forwardOneFrame()
    {
        if (this.state.currentTraceNumber < (this.state.executionSessions[this.state.currentSessionNumber].executionTraces.length - 1))
        {
            this.setState({currentTraceNumber: this.state.currentTraceNumber + 1}, () => this.updatePageWithNewTrace());
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

            currentTraceId = this.state.executionSessions[sessionNumber].executionTraces[traceNumber];

        } while (this.state.executionSessions[sessionNumber].executionTracesWithChanges.indexOf(currentTraceId) === -1)

        this.setState({
            currentSessionNumber: sessionNumber,
            currentTraceNumber: traceNumber
        }, () => this.updatePageWithNewTrace());
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

            currentTraceId = this.state.executionSessions[sessionNumber].executionTraces[traceNumber];

        } while (this.state.executionSessions[sessionNumber].executionTracesWithChanges.indexOf(currentTraceId) === -1)

        this.setState({
            currentSessionNumber: sessionNumber,
            currentTraceNumber: traceNumber
        }, () => this.updatePageWithNewTrace());
    }

    moveToPreviousSession()
    {
        if (this.state.currentSessionNumber > 0)
        {
            this.setState({
                currentSessionNumber: this.state.currentSessionNumber - 1,
                currentTraceNumber: 0
            }, () => this.updatePageWithNewTrace());
        }
    }

    moveToNextSession()
    {
        if (this.state.currentSessionNumber < (this.state.executionSessions.length - 1))
        {
            this.setState({
                currentSessionNumber: this.state.currentSessionNumber + 1,
                currentTraceNumber: 0
            }, () => this.updatePageWithNewTrace());
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

        if(priorVideoElement)
        {
            // Divide by three here because the video has a frame rate of 3 frames per second.
            // Also the +1 is because we need to skip the very first frame, and the final +0.1
            // is to help ensure we don't seek to a frame boundary
            priorVideoElement.currentTime = (this.state.currentTraceNumber + 1) / 3.0 + 0.1;
        }

        if(newVideoElement)
        {
            newVideoElement.currentTime = (this.state.currentTraceNumber + 1) / 3.0 + 0.1;
        }
    }

    setPriorVideoSize(elem)
    {
        const newState = {
            priorVideoWidth: elem.videoWidth,
            priorVideoHeight: elem.videoHeight,
        };
        this.setState(newState)
    }

    setNewVideoSize(elem)
    {
        const newState = {
            newVideoWidth: elem.videoWidth,
            newVideoHeight: elem.videoHeight,
        };
        this.setState(newState)
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
                <p>Did not find any executions sessions which had behaviour change detection performed on them. This may be your first testing run, or behaviour change detection simply may not have run yet.</p>
            </FullColumn>;
        }

        return(
            <FullColumn>
                <Row>
                    <Column xs={4}>
                        <Row className={""}>
                            {/*<h4>Last Testing Run</h4>*/}
                            <div className={"differences-screenshot-wrapper"}>
                                <video style={{"width": "100%"}}
                                       className="differences-video"
                                       onLoadedMetadata={(evt) => this.setPriorVideoSize(evt.target)}
                                       id={"prior-execution-session-video"}>

                                    <source src={`${process.env.REACT_APP_BACKEND_API_URL}execution_sessions/${this.state.executionSessions[this.state.currentSessionNumber].changeDetectionPriorExecutionSessionId}/raw_video?token=${Auth.getQueryParameterToken()}`}
                                            type="video/mp4"
                                    />
                                    <span>Your browser does not support the video tag.</span>
                                </video>
                                {
                                    this.state.differences.map((difference, differenceIndex) =>
                                    {
                                        if (difference.differenceType === 'added_text')
                                        {
                                            return null;
                                        }

                                        if (this.state.selectedChange !== null)
                                        {
                                            if (difference._id === this.state.selectedChange._id)
                                            {
                                                return null;
                                            }
                                        }

                                        if (difference.priorBottom < 0 || difference.priorRight < 0)
                                        {
                                            return null;
                                        }

                                        if (difference.priorLeft >= this.state.priorVideoWidth || difference.priorTop >= this.state.priorVideoHeight)
                                        {
                                            return null;
                                        }


                                        const styleAttributes = {
                                            "left": `${Math.max(0, difference.priorLeft) * 100 / this.state.priorVideoWidth}%`,
                                            "top": `${Math.max(0, difference.priorTop) * 100 / this.state.priorVideoHeight}%`,
                                            "height": `${(Math.min(this.state.priorVideoHeight, difference.priorBottom) - Math.max(0, difference.priorTop)) * 100 / this.state.priorVideoHeight}%`,
                                            "width": `${(Math.min(this.state.priorVideoWidth, difference.priorRight) - Math.max(0, difference.priorLeft)) * 100 / this.state.priorVideoWidth}%`
                                        }

                                        let className = `difference-box ${difference.differenceType}`;
                                        if (this.state.hilightedChange !== null)
                                        {
                                            if (difference._id === this.state.hilightedChange._id)
                                            {
                                                className += " hilighted";
                                            }
                                            else
                                            {
                                                className += " suppressed";
                                            }
                                        }

                                        return <div key={differenceIndex}
                                                    className={className}
                                                    style={styleAttributes}
                                                    onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                    onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                        >

                                        </div>
                                    })
                                }
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
                                        title={"Backward to last frame with changes"}
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
                                    Frame {this.state.currentTraceNumber + 1} / {this.state.executionSessions[this.state.currentSessionNumber].executionTraces.length}
                                    <br/>
                                    Session {this.state.currentSessionNumber + 1} / {this.state.executionSessions.length}
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

                                <video style={{"width": "100%"}}
                                       className="differences-video"
                                       onLoadedMetadata={(evt) => this.setNewVideoSize(evt.target)}
                                       id={"new-execution-session-video"}>
                                    <source src={`${process.env.REACT_APP_BACKEND_API_URL}execution_sessions/${this.state.executionSessions[this.state.currentSessionNumber]._id}/raw_video?token=${Auth.getQueryParameterToken()}`}
                                            type="video/mp4" />
                                    <span>Your browser does not support the video tag.</span>
                                </video>
                                {
                                    this.state.differences.map((difference, differenceIndex) =>
                                    {
                                        if (difference.differenceType === 'deleted_text')
                                        {
                                            return null;
                                        }

                                        if (this.state.selectedChange !== null)
                                        {
                                            if (difference._id === this.state.selectedChange._id)
                                            {
                                                return null;
                                            }
                                        }

                                        if (difference.newBottom < 0 || difference.newRight < 0)
                                        {
                                            return null;
                                        }

                                        if (difference.newLeft >= this.state.newVideoWidth || difference.newTop >= this.state.newVideoHeight)
                                        {
                                            return null;
                                        }

                                        const styleAttributes = {
                                            "left": `${Math.max(0, difference.newLeft) * 100 / this.state.newVideoWidth}%`,
                                            "top": `${Math.max(0, difference.newTop) * 100 / this.state.newVideoHeight}%`,
                                            "height": `${(Math.min(this.state.newVideoHeight, difference.newBottom) - Math.max(0, difference.newTop)) * 100 / this.state.newVideoHeight}%`,
                                            "width": `${(Math.min(this.state.newVideoWidth, difference.newRight) - Math.max(0, difference.newLeft)) * 100 / this.state.newVideoWidth}%`
                                        }

                                        let className = `difference-box ${difference.differenceType}`;
                                        if (this.state.hilightedChange !== null)
                                        {
                                            if (difference._id === this.state.hilightedChange._id)
                                            {
                                                className += " hilighted";
                                            }
                                            else
                                            {
                                                className += " suppressed";
                                            }
                                        }

                                        return <div key={differenceIndex}
                                                    className={className}
                                                    style={styleAttributes}
                                                    onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                    onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                        >

                                        </div>
                                    })
                                }
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

                                                    if (this.state.selectedChange !== null)
                                                    {
                                                        if (difference._id === this.state.selectedChange._id)
                                                        {
                                                            classes += " selected"
                                                        }
                                                    }

                                                    if (this.state.hilightedChange !== null)
                                                    {
                                                        if (difference._id === this.state.hilightedChange._id)
                                                        {
                                                            classes += " hilighted";
                                                        }
                                                        else
                                                        {
                                                            classes += " suppressed";
                                                        }
                                                    }

                                                    return <div
                                                        className={classes}
                                                        onMouseEnter={() => this.onDifferenceMouseEnter(difference)}
                                                        onMouseLeave={() => this.onDifferenceMouseLeave(difference)}
                                                    >
                                                        {
                                                            difference.isDuplicate ? <div title={"Duplicate Difference"} className={"duplicate-icon-wrapper"}><RepeatIcon /></div> : null
                                                        }

                                                        {this.getDescriptionForDifference(difference)}
                                                    </div>;
                                                }
                                            }
                                        ]}
                                        data={this.state.differences}
                                        title=""
                                        onRowClick={this.onDifferenceClick.bind(this)}
                                        style={{"width": "100%", "marginLeft": "10px"}}
                                        options={{
                                            search: false,
                                            pageSize: 10,
                                            pageSizeOptions: [10, 20, 50],
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
