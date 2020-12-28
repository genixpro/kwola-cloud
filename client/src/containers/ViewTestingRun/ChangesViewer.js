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
import Papersheet from "../../components/utility/papersheet";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowForward from "@material-ui/icons/ArrowForward";
import FastForwardIcon from '@material-ui/icons/FastForward';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import FastRewindIcon from '@material-ui/icons/FastRewind';

class ChangesViewer extends Component{
    state = {

    };

    constructor(props)
    {
        super(props);
    }


    handleRowClick()
    {

    }


    render()
    {
        const tableData = this.state.changes;

        return(
            <FullColumn>
                <Row>
                    <Column xs={4}>
                        <Row className={""}>
                            {/*<h4>Last Testing Run</h4>*/}
                            <div className={"differences-screenshot-wrapper"}>
                                {/*<img src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.props.testingRun.applicationId}/image?token=${Auth.getQueryParameterToken()}`} className="differences-screenshot" />*/}
                                <img src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.props.testingRun.applicationId}/image?token=${Auth.getQueryParameterToken()}`} className="differences-screenshot" />
                            </div>
                        </Row>
                        <Row>
                            <div className={"difference-viewer-control-buttons-wrapper"}>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Backward to last frame"}
                                        onClick={() => this.backwardOneFrame()}>
                                    <SkipPreviousIcon />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Backward to last frame"}
                                        onClick={() => this.backwardOneFrame()}>
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
                                    Session 2 / 20
                                </div>

                                {/*<Button variant="contained"*/}
                                {/*        color={"primary"}*/}
                                {/*        className="difference-viewer-control-button"*/}
                                {/*        title={"Current"}*/}
                                {/*        onClick={() => this.seekToAction(this.state.bug.stepNumber)}>*/}
                                {/*    <span>Skip to bug frame in video</span>*/}
                                {/*</Button>*/}
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
                                        onClick={() => this.forwardOneFrame()}>
                                    <FastForwardIcon />
                                </Button>
                                <Button variant="contained"
                                        color={"primary"}
                                        className="difference-viewer-control-button"
                                        title={"Forward to next frame with changes"}
                                        onClick={() => this.forwardOneFrame()}>
                                    <SkipNextIcon />
                                </Button>
                            </div>
                        </Row>
                        <Row>
                            {/*<h4>This Testing Run</h4>*/}
                            <div className={"differences-screenshot-wrapper"}>
                                <img src={`${process.env.REACT_APP_BACKEND_API_URL}application/${this.props.testingRun.applicationId}/image?token=${Auth.getQueryParameterToken()}`} className="differences-screenshot" />
                            </div>
                        </Row>
                    </Column>
                    <Column xs={8}>
                        <Row>
                            <MaterialTable
                                columns={[
                                    { title: 'id', field: '_id', hidden: true },
                                    {
                                        title: 'Change',
                                        field: 'description'
                                    }
                                ]}
                                data={tableData}
                                title=""
                                onRowClick={this.handleRowClick.bind(this)}
                                style={{"width": "100%", "marginLeft": "10px"}}
                                options={{
                                    search: false,
                                    pageSize: 10,
                                    pageSizeOptions: [5,10,20,50],
                                    toolbar:false,
                                    rowStyle: {
                                        fontSize:"14px"
                                    }
                                }}
                            />
                        </Row>
                    </Column>
                </Row>
            </FullColumn>
        )
    }
}
const mapStateToProps = (state) => {return { ...state.ChangesViewer} };
export default connect(mapStateToProps)(ChangesViewer);