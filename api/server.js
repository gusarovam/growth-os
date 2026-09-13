import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());


app.post("/api/ai", async (req, res) => {

  try {

    const data = req.body;

    let rules = [];

    const completed = data.completed || 0;
    const scroll = data.scroll || 0;
    const energy = data.energy || 3;


    if (completed < 3) {
      rules.push(
        "Protect your focus. Choose fewer tasks and finish the most important one."
      );
    }

    if (completed >= 5) {
      rules.push(
        "Your workload is realistic. Keep the same rhythm next week."
      );
    }


    if (scroll > 180) {
      rules.push(
        "Reduce scrolling time. Create a phone-free block during deep work."
      );
    }


    if (energy <= 2) {
      rules.push(
        "Your energy is low. Add more recovery and reduce unnecessary pressure."
      );
    }


    if (rules.length === 0) {
      rules.push(
        "Your week looks balanced. Improve one small system at a time."
      );
    }


    res.json({

      headline: "Your weekly pattern",

      summary: rules[0],

      rules: rules,

      nextWeek: "Start with one meaningful improvement instead of changing everything."

    });


  } catch(error){

    res.status(500).json({
      error: error.message
    });

  }

});


app.listen(3001, () => {
  console.log("AI Coach running on http://localhost:3001");
});
