import React, { Component, Fragment }  from 'react';
import { Card, CardImg, CardText, CardBody,
  CardTitle } from 'reactstrap';

class DishDetail extends Component {
    renderComments (comments) {
      console.log(comments);
      const comment = comments.map((obj)=> { return <Fragment key={obj.id} ><li>{obj.comment}</li>- <li> {obj.author} , {obj.date}</li></Fragment>});
      if (comments != null)
          return(
              <div>
                <h4>Comments</h4>
                <ul className="list-unstyled">
                  {comment}
                </ul>
              </div>
          );
      else
          return(
              <div></div>
          );
    }

    render() {
        
        if(this.props.dish != null){
          console.log(this.props.dish)
          return (
            <div className="row">
              <div  className="col-12 col-md-5 m-1">
                <Card>
                    <CardImg top src={this.props.dish.image} alt={this.props.dish.name} />
                    <CardBody>
                      <CardTitle>{this.props.dish.name}</CardTitle>
                      <CardText>{this.props.dish.description}</CardText>                   
                    </CardBody>
                </Card>
              </div>
              <div  className="col-12 col-md-5 m-1">
                {this.renderComments (this.props.dish.comments)}
              </div>
            </div>
          );

        }else{
          return <div/>
        }
        
    }
}

export default DishDetail;