import { getDietRecipeById } from "../diet-recipes";
import { selectedDietRecipeId } from "../diet-plan/state";

const mock = getDietRecipeById(selectedDietRecipeId.value);

export default mock;
