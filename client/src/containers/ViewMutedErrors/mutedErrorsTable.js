import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'
import Button from "../../components/uielements/button";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import Icon from "../../components/uielements/icon";
import axios from "axios";

class MutedErrorsTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };

    handleRowClick(event, rowData)
	{
    	// this.props.history.push(`/app/dashboard/execution_sessions/${rowData._id}`)
    }

    processData(data)
	{
    	let rdata = []
    	if(data){
    		data.map(mutedError=>{

	    		mutedError.mostRecentOccurrenceFormatted = mutedError.mostRecentOccurrence ? moment(new Date(mutedError.mostRecentOccurrence.$date)).format('HH:mm MMM Do') : null
				if (mutedError.error)
				{
					mutedError.message = mutedError.error.message;
				}

	    		rdata.push(mutedError)
	    	})
    	}
    	return rdata;
    }

    deleteMutedErrorClicked(evt, mutedError)
	{
		let index = 0;
		for (let listError of this.props.data)
		{
			if (listError._id === mutedError._id)
			{
				break;
			}
			else
			{
				index += 1;
			}
		}

		axios.delete(`/muted_errors/${mutedError._id}`).then((response) =>
		{
			this.props.onMutedErrorDeleted(index);
		});

		evt.stopPropagation();
	}

	render()
	{
        let tableData = this.processData(this.props.data)
	 	return(
	 		<div>
		     	<MaterialTable
		          columns={[
					  { title: 'id', field: '_id', hidden:true },
					  { title: 'Last Seen', field: 'mostRecentOccurrenceFormatted' },
					  { title: 'Message', field: 'message',
						  width:'70%',
						  cellStyle: {
							  maxWidth:100,
							  overflow: 'hidden',
							  textOverflow: 'ellipsis',
							  whiteSpace: 'nowrap'
						  },
					  },
					  { title: 'Total Occurrences', field: 'totalOccurrences' },
					  {
						  field: 'url',
						  title: 'Options',
						  render: (rowData) => <Button variant="contained" size="small" color="secondary" onClick={(evt) => this.deleteMutedErrorClicked(evt, rowData)}>
							  <Icon>delete</Icon>
						  </Button>
					  }
		          ]}
		          data={tableData}
		          title=""
		          onRowClick={(event, rowData) => this.handleRowClick(event, rowData)}
		          options={{
                    pageSize:10,
                    pageSizeOptions:[10,20,50],
                    rowStyle: {
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word",
                      fontSize:"14px"
                    }
                  }}
		        />
	        </div>
	    )
	}
}
const mapStateToProps = (state) => {return { ...state.MutedErrorsTable} };
export default connect(mapStateToProps)(MutedErrorsTable);
