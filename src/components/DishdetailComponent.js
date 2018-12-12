import React, { Fragment }  from 'react';
import { Card, CardImg, CardText, CardBody,
  CardTitle } from 'reactstrap';


  function RenderDish({dish}) {
    return(
      <div  className="col-12 col-md-5 m-1">
        <Card>
            <CardImg top src={dish.image} alt={dish.name} />
            <CardBody>
              <CardTitle>{dish.name}</CardTitle>
              <CardText>{dish.description}</CardText>                   
            </CardBody>
        </Card>
      </div>
    );    
  }

  function RenderComments({comments}) {
    console.log(comments);
    const commentList = comments.map((obj)=> { return <Fragment key={obj.id} ><li>{obj.comment}</li>- <li> {obj.author} , {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit'}).format(new Date(Date.parse(obj.date)))}</li></Fragment>});
    if (comments != null)
        return(
          <div className="col-12 col-md-5 m-1">
            <div>
              <h4>Comments</h4>
              <ul className="list-unstyled">
                {commentList}
              </ul>
            </div>
          </div>
        );
    else
        return(
          <div className="col-12 col-md-5 m-1"></div>
        );
  }

  const  DishDetail = (props) => {



    
    if(props.dish != null){
      console.log(props.dish)
      return (
        <div className="container">
          <div className="row">
            <RenderDish dish={props.dish} />
            <RenderComments comments={props.dish.comments} />
          </div>
        </div>
      );

    }else{
      return <div/>
    }
    
  }

export default DishDetail;