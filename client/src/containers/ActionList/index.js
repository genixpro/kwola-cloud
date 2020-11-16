import React, { Component } from 'react';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import axios from "axios";

class ActionList extends Component {
    state = {

    };

    componentDidMount()
    {

    }


    render() {
        return (
            this.props.executionTraces ?
                <Table style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Frame</TableCell>
                            <TableCell>Action Type</TableCell>
                            <TableCell>Action X</TableCell>
                            <TableCell>Action Y</TableCell>
                            {
                                !this.props.disableCoverage ?
                                    <TableCell>Cumulative Branch Coverage</TableCell> : null
                            }
                            {
                                !this.props.disableNewBranches ?
                                <TableCell>New Branch Executed</TableCell> : null
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(this.props.executionTraces || []).map(trace => {
                            return (
                                <TableRow key={trace._id} hover={true} onClick={() => this.props.history.push(`/app/dashboard/execution_sessions/${this.props.match.params.id}/execution_traces/${trace._id}`)} >
                                    <TableCell>{trace.frameNumber}</TableCell>
                                    <TableCell>{trace.actionPerformed.type.toString()}</TableCell>
                                    <TableCell>{trace.actionPerformed.x.toString()}</TableCell>
                                    <TableCell>{trace.actionPerformed.y.toString()}</TableCell>
                                    {
                                        !this.props.disableCoverage ?
                                            <TableCell>{(trace.cumulativeBranchCoverage * 100).toFixed(3)}%</TableCell>
                                            : null
                                    }
                                    {
                                        !this.props.disableNewBranches ?
                                            <TableCell>{trace.didNewBranchesExecute.toString()}</TableCell>
                                            : null
                                    }
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table> : null
        );
    }
}

export default ActionList;

