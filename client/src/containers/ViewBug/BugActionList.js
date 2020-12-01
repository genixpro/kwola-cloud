import React, { Component } from 'react';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import axios from "axios";
import Auth from "../../helpers/auth0";
import "./BugActionList.scss";
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import {Button} from "../UiElements/Button/button.style";

class BugActionList extends Component {
    state = {

    };

    componentDidMount()
    {
        this.setState({spriteSheetImageURL: `${process.env.REACT_APP_BACKEND_API_URL}bugs/${this.props.bug._id}/frame_sprite_sheet?token=${Auth.getQueryParameterToken()}`});
    }

    goToActionClicked(actionIndex)
    {
        if (this.props.onGoToActionClicked)
        {
            this.props.onGoToActionClicked(actionIndex);
        }
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
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(this.props.bug.actionsPerformed.slice(0).reverse() || []).map((action,actionIndex) => {
                            const reverseActionIndex = this.props.bug.actionsPerformed.length - actionIndex - 1;

                            return (
                                <TableRow key={actionIndex} hover={true} className={`${reverseActionIndex === this.props.bug.stepNumber ? "hilighted-bug-row": ""}`}>
                                    <TableCell>{reverseActionIndex + 1}</TableCell>
                                    <TableCell>{action.type.toString()}</TableCell>
                                    <TableCell>
                                        <div className={"frame-sprite-wrapper"}>
                                            <img
                                                className={"frame-sprite-image"}
                                                src={this.state.spriteSheetImageURL}
                                                style={{"top": `${reverseActionIndex * -100}px`}}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            title={"Go to this frame"}
                                            variant="extended"
                                            color="primary"
                                            // style={{"backgroundColor": "#c70505"}}
                                            onClick={() => this.goToActionClicked(reverseActionIndex)}
                                        >
                                            <ExitToAppIcon/>
                                        </Button>
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

