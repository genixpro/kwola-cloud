import React, { Component } from 'react';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import axios from "axios";
import Auth from "../../helpers/auth0";
import "./BugActionList.scss";

class BugActionList extends Component {
    state = {

    };

    componentDidMount()
    {
        this.setState({spriteSheetImageURL: `${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.props.bug._id}/frame_sprite_sheet?token=${Auth.getQueryParameterToken()}`});
    }


    render()
    {
        return (
            this.props.bug ?
                <Table style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Frame</TableCell>
                            <TableCell>Action Type</TableCell>
                            <TableCell>Screenshot</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(this.props.bug.actionsPerformed || []).map((action,actionIndex) => {
                            return (
                                <TableRow key={actionIndex} hover={true} className={`${actionIndex === this.props.bug.stepNumber ? "hilighted-bug-row": ""}`}>
                                    <TableCell>{actionIndex + 1}</TableCell>
                                    <TableCell>{action.type.toString()}</TableCell>
                                    <TableCell>
                                        <div className={"frame-sprite-wrapper"}>
                                            <img
                                                className={"frame-sprite-image"}
                                                src={this.state.spriteSheetImageURL}
                                                style={{"top": `${actionIndex * -150}px`}}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table> : null
        );
    }
}

export default BugActionList;

